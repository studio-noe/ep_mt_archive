// ══════════════════════════════════════════════════════════════
//  B안: 손 스크럽 (카메라)
//  손을 펴고 개헤엄처럼 바닥을 긁듯 번갈아 저으면 한 번 저을 때마다 다음 컷으로 넘어간다.
//  손이 발이 된다 — 관람자가 네 발로 달려야 기록이 앞으로 간다.
//  app.js의 전역(PH / D / setPhoto / moveMarker / stopAuto / burst)을 그대로 쓴다.
//
//  ★ getUserMedia는 iOS 때문에 반드시 사용자 제스처 안에서 호출해야 한다
//    → 인트로의 "Dive in" 클릭 핸들러에서 시작한다.
//  ★ 영상은 전부 기기 안에서 처리하고 어디에도 보내지 않는다.
// ══════════════════════════════════════════════════════════════
const HAND={
  AMP:0.045,          // 한 번 젓는 것으로 인정할 최소 진폭(화면 높이 비율). 올리면 크게 저어야 한다
  GAP:140,            // 젓기 사이 최소 간격(ms). 속도 상한
  IDLE:2500,          // 이만큼 쉬면 케이던스 표시만 초기화 (검출 상태는 건드리지 않는다)
  PER:1,              // 몇 번 저어야 한 컷 넘어가는가
  FPS:24,             // 추론 주기. 올리면 반응이 빠르고 배터리를 더 먹는다
  on:false, hands:null,
  sign:0, base:null, steps:0, prog:0, lastTrig:0, lastStep:0, gaps:[]
};
// 진단값 — 어디서 막혔는지 화면에 그대로 보여준다
const DBG={mod:'대기',cam:'대기',vid:'-',infer:0,fps:0,hits:0,seen:false,paws:0,sig:0,err:''};

const hStatus=document.getElementById('hstatus'),hPrev=document.getElementById('hprev'),
      hDot=document.getElementById('hdot'),hWrap=document.getElementById('hand'),
      hcv=document.getElementById('hcv'),hcx=hcv?hcv.getContext('2d'):null;

function hRender(){
  if(!hStatus)return;
  hStatus.className='hstatus'+(DBG.err?' off':(DBG.seen?' live':''));
  const g=HAND.gaps,spm=g.length?Math.round(60000/(g.reduce((a,b)=>a+b,0)/g.length)):0;
  const fresh=performance.now()-HAND.lastStep<HAND.IDLE;
  hStatus.innerHTML=
    '모듈 '+DBG.mod+'<br>카메라 '+DBG.cam+' '+DBG.vid+
    '<br>추론 '+DBG.fps+'/s · 펼친손 '+DBG.paws+
    '<br>젓기 '+HAND.steps+(fresh&&spm?' · 분당'+spm:'')+
    '<br>흔들림 '+(DBG.sig>=0?'+':'')+DBG.sig.toFixed(3)+' / '+HAND.AMP+
    (DBG.err?'<br>'+DBG.err:'');
}
setInterval(()=>{DBG.fps=DBG.infer;DBG.infer=0;hRender();},1000);

// 거리(km) → 가장 가까운 컷. app.js의 idxFromX는 픽셀 기준이라 여기선 km으로 직접 찾는다
function idxFromKm(km){let b=0,bd=1e9;PH.forEach((p,i)=>{const d=Math.abs(p.km-km);if(d<bd){bd=d;b=i;}});return b;}

// 말린 손가락 수. 첫 마디(PIP)보다 끝(TIP)이 아래면 말린 것으로 본다
function curledCount(lm){
  let c=0;
  [[8,6],[12,10],[16,14],[20,18]].forEach(([tip,pip])=>{if(lm[tip].y>lm[pip].y)c++;});
  return c;
}
// 펼친 손(개헤엄의 발). 꽉 쥔 주먹만 걸러낸다 — 바닥을 긁는 손은 살짝 굽으므로
// 완전히 편 상태를 요구하면 안 잡힌다. 말린 손가락 2개 이하면 펼친 것으로 본다.
function isPaw(lm){return curledCount(lm)<=2;}

// ── 젓기 검출 (개헤엄) ──────────────────────────────────────────
//  양손이면 두 손의 높이 차(왼-오른)를 신호로 쓴다. 번갈아 저으면 이 값이
//  규칙적으로 부호를 바꾼다. 한 손만 보이면 그 손의 느린 평균 대비 흔들림을 쓴다.
//  슈미트 트리거: +AMP를 넘겼다가 -AMP 아래로 내려갈 때 한 번으로 센다.
//  (단순 영점 교차는 손 떨림에 과하게 세진다)
function swingSignal(hands){
  if(hands.length>=2){
    const s=hands.slice().sort((a,b)=>a.x-b.x);   // 화면 왼쪽 손이 항상 앞에 오도록
    HAND.base=null;
    return s[0].y-s[1].y;
  }
  const y=hands[0].y;
  // 기준선이 빠르면 느린 젓기를 따라가버려 신호가 0으로 죽는다. 아주 느리게 둔다.
  HAND.base=HAND.base===null?y:HAND.base+(y-HAND.base)*0.01;
  return y-HAND.base;
}

function onSwing(sig,now){
  // ★ 쉬었다고 sign을 되돌리지 않는다. 되돌리면 그 다음 젓기가 '기준 잡기'로 먹히고,
  //   IDLE보다 느리게 저으면 모든 젓기가 먹혀 영원히 안 넘어간다(실제로 겪은 버그).
  if(now-HAND.lastStep>HAND.IDLE)HAND.gaps.length=0;   // 케이던스 표시만 초기화
  const want=HAND.sign<=0?1:-1;                 // 다음에 넘어야 할 방향
  if(want*sig<HAND.AMP)return false;            // 아직 진폭이 모자라다
  if(HAND.sign!==0&&now-HAND.lastTrig<HAND.GAP)return false;
  const first=HAND.sign===0;                    // 맨 처음 한 번만 위상을 잡는다
  HAND.sign=want; HAND.lastTrig=now;
  if(first)return false;
  HAND.gaps.push(now-HAND.lastStep); if(HAND.gaps.length>6)HAND.gaps.shift();
  HAND.lastStep=now; HAND.steps++; HAND.prog++;
  if(HAND.prog<HAND.PER)return false;           // 아직 한 컷을 채우지 못했다
  HAND.prog=0; return true;
}

// 미리보기 위에 손 랜드마크를 그린다. 잡히는지 눈으로 바로 확인하려고.
const BONES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
             [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function drawLM(hands){
  if(!hcx)return;
  const w=hcv.width,h=hcv.height;
  hcx.clearRect(0,0,w,h);
  if(!hands||!hands.length)return;
  const X=p=>(1-p.x)*w, Y=p=>p.y*h;      // 미리보기가 거울이라 x를 뒤집어 맞춘다
  hands.forEach(L=>{
    const paw=isPaw(L);
    hcx.strokeStyle=paw?'rgba(240,162,60,.95)':'rgba(140,150,140,.5)';  // 펼친 손이면 앰버
    hcx.lineWidth=paw?1.6:1;
    hcx.beginPath();
    BONES.forEach(([a,b])=>{hcx.moveTo(X(L[a]),Y(L[a]));hcx.lineTo(X(L[b]),Y(L[b]));});
    hcx.stroke();
    hcx.fillStyle=paw?'#ece9dd':'rgba(236,233,221,.45)';
    L.forEach(p=>hcx.fillRect(X(p)-1.5,Y(p)-1.5,3,3));
    hcx.fillStyle=paw?'#f0a23c':'rgba(240,162,60,.4)';   // 손목에 높이 표시
    hcx.fillRect(0,Y(L[0])-1,w,1.5);
  });
}

// ── 하단 게이지 ────────────────────────────────────────────────
//  왼쪽 = 지금 움직임 세기(기준치 AMP를 넘으면 앰버로 찬다)
//  오른쪽 = 다음 컷까지 남은 젓기 칸
const gFill=document.getElementById('gfill'),gSegs=document.getElementById('gsegs'),
      gLab=document.getElementById('glab'),gWrap=document.getElementById('gauge');
function buildSegs(){
  if(!gSegs)return;
  gSegs.innerHTML='';
  for(let i=0;i<HAND.PER;i++)gSegs.appendChild(document.createElement('i'));
}
function gaugeUpdate(sig){
  if(!gWrap)return;
  gWrap.classList.add('show');
  const r=Math.min(1,Math.abs(sig||0)/HAND.AMP);
  if(gFill){gFill.style.width=(r*100)+'%';gFill.classList.toggle('hot',r>=1);}
  if(gSegs){
    if(gSegs.children.length!==HAND.PER)buildSegs();
    for(let i=0;i<gSegs.children.length;i++)gSegs.children[i].classList.toggle('on',i<HAND.prog);
  }
  if(gLab)gLab.textContent=HAND.prog+' / '+HAND.PER;
}

function stepOnce(){
  stopAuto(); hideHint();
  setPhoto(cur>=PH.length-1?0:cur+1);    // 한 번 저을 때마다 다음 컷
  if(hDot)hDot.style.left=(cur/(PH.length-1)*100)+'%';   // 바는 코스 진행도
}
// 카메라 없이 리듬 로직만 확인할 때: HAND._test(신호값)
HAND._test=sig=>{const hit=onSwing(sig,performance.now());if(hit)stepOnce();return hit;};

function onResults(res){
  const all=(res&&res.multiHandLandmarks)||[];
  drawLM(all);
  if(!all.length){DBG.seen=false;DBG.paws=0;return;}
  DBG.seen=true;DBG.hits++;
  // 펼친 손만 센다. 주먹을 쥐면 멈춘다.
  const paws=all.filter(isPaw).map(L=>({x:L[9].x,y:L[0].y}));
  DBG.paws=paws.length;
  if(!paws.length){HAND.sign=0;return;}
  const sig=swingSignal(paws);
  DBG.sig=sig;
  if(onSwing(sig,performance.now()))stepOnce();
  gaugeUpdate(sig);
}

async function startHand(){
  if(HAND.on)return; HAND.on=true;
  if(hWrap){hWrap.classList.add('show');hWrap.classList.remove('nocam');}
  DBG.cam='여는 중';hRender();

  let stream;
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
  }catch(e){
    HAND.on=false;DBG.cam='거부/실패';DBG.err=(e&&e.name||'오류')+' — 드래그로 보셔도 됩니다';
    if(hWrap)hWrap.classList.add('nocam');hRender();return;
  }
  hPrev.srcObject=stream;
  try{await hPrev.play();}catch(e){DBG.err='재생 실패: '+(e&&e.name);}
  // 영상 크기가 잡힐 때까지 기다린다 (0x0이면 MediaPipe가 조용히 아무것도 못 한다)
  for(let i=0;i<50&&!hPrev.videoWidth;i++)await new Promise(r=>setTimeout(r,100));
  DBG.cam='켜짐';DBG.vid=hPrev.videoWidth+'x'+hPrev.videoHeight;hRender();
  if(!hPrev.videoWidth){DBG.err='영상 크기 0 — 카메라를 다른 앱이 쓰고 있는지 확인';hRender();return;}
  if(hcv){hcv.width=hPrev.clientWidth||112;hcv.height=hPrev.clientHeight||84;}

  if(typeof Hands==='undefined'){
    DBG.mod='로드 실패';DBG.err='MediaPipe를 못 불러왔습니다 (네트워크/차단 확인)';hRender();return;
  }
  DBG.mod='초기화 중';hRender();
  try{
    HAND.hands=new Hands({locateFile:f=>'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/'+f});
    HAND.hands.setOptions({maxNumHands:2,modelComplexity:0,minDetectionConfidence:0.5,minTrackingConfidence:0.4});
    HAND.hands.onResults(onResults);
    await HAND.hands.initialize();
    DBG.mod='준비됨';
  }catch(e){
    DBG.mod='초기화 실패';DBG.err=String(e&&e.message||e).slice(0,90);hRender();return;
  }
  hRender();

  let busy=false,last=0;
  const tick=async ts=>{
    requestAnimationFrame(tick);
    if(!HAND.on||busy||ts-last<1000/HAND.FPS||hPrev.readyState<2||!hPrev.videoWidth)return;
    last=ts; busy=true;
    try{await HAND.hands.send({image:hPrev});DBG.infer++;}
    catch(e){DBG.err='추론 오류: '+String(e&&e.message||e).slice(0,70);}   // 삼키지 않는다
    busy=false;
  };
  requestAnimationFrame(tick);
}

function stopHand(){
  if(!HAND.on)return; HAND.on=false;
  if(hPrev&&hPrev.srcObject){hPrev.srcObject.getTracks().forEach(t=>t.stop());hPrev.srcObject=null;}
  DBG.cam='꺼짐';DBG.seen=false;DBG.paws=0;drawLM(null);hRender();
}

// 인트로 버튼 클릭 = 사용자 제스처. 여기서 카메라를 연다
const goBtn=document.getElementById('go');
if(goBtn)goBtn.addEventListener('click',startHand);
addEventListener('keydown',e=>{if(e.key==='c'||e.key==='C'){HAND.on?stopHand():startHand();}});
hRender();
