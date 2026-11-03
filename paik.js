// ══════════════════════════════════════════════════════════════
//  C안: 백남준 CRT 합성 레이어 (c.html 전용)
//  1) 숫자는 글리치 그림자 대신 자릿수가 촤라락 돌다 멈춘다
//  2) HUD는 기본으로 물러나 있고 만지면 올라온다 — 미디어가 주인공
//  3) 색은 심박대에 따라 살아 움직인다 (berry / amber / moss)
//  4) CRT 셰이더 강도는 app.js의 실제 burst에 물려 있다
// ══════════════════════════════════════════════════════════════

// ── 숫자 롤링 ──────────────────────────────────────────────────
//  목표 문자열의 자릿수를 왼쪽부터 차례로 고정한다. 숫자가 아닌 글자
//  (소수점·콜론·슬래시)는 그대로 통과시켜 자리가 흔들리지 않게 한다.
function roll(el,to,unit){
  if(!el)return;
  to=String(to);
  const chars=to.split('');
  if(el._to===to){                       // 값이 그대로면 다시 돌리지 않는다
    return;
  }
  el._to=to;
  if(el._raf)cancelAnimationFrame(el._raf);
  const t0=performance.now(),ms=380;
  const u=unit?'<span class="u">'+unit+'</span>':'';
  const step=t=>{
    const p=Math.min(1,(t-t0)/ms);
    let s='';
    for(let i=0;i<chars.length;i++){
      const c=chars[i];
      if(c<'0'||c>'9'){s+=c;continue;}
      const lock=0.12+(i+1)/chars.length*0.88;
      s+=p>=lock?c:String(Math.random()*10|0);
    }
    el.innerHTML=s+u;
    if(p<1)el._raf=requestAnimationFrame(step); else el._raf=0;
  };
  step(t0);                      // 첫 프레임은 동기로 — 안 그러면 app.js가 쓴 값이 한 프레임 비친다
  el._raf=requestAnimationFrame(step);
}

// ── HUD 깨우기 ─────────────────────────────────────────────────
//  평소엔 흐리게 물러나 있다가, 손을 대면 2.6초간 또렷해진다.
const hudEl=document.getElementById('hud');
let wakeT=0;
function wake(){
  if(!hudEl)return;
  hudEl.classList.add('wake');
  clearTimeout(wakeT);
  wakeT=setTimeout(()=>hudEl.classList.remove('wake'),2600);
}
['pointerdown','pointermove','keydown','wheel','touchstart'].forEach(e=>
  addEventListener(e,wake,{passive:true}));

// ── setPhoto 가로채기 ──────────────────────────────────────────
//  app.js가 넣은 문자열을 롤링 숫자로 다시 쓴다.
//  함수 선언이라 재할당하면 app.js 내부 호출도 이 래퍼를 탄다.
const seqLab=document.getElementById('seqlab'),chno=document.getElementById('chno'),root=document.documentElement;
const _setPhoto=setPhoto;
setPhoto=function(i){
  _setPhoto(i);
  const p=PH[cur]; if(!p)return;
  root.style.setProperty('--hr',hrHex(p.hr));      // 심박대 색이 02 패널 전체를 물들인다
  roll(mkm,p.km.toFixed(1),'km');
  roll(mhr,p.hr,'bpm');
  roll(mele,Math.round(p.ele),'m');
  roll(lat,p.lat.toFixed(5));
  roll(lon,p.lon.toFixed(5));
  roll(stime,p.tm);
  const g=(typeof stackOf==='function')?stackOf(cur):[cur];
  mtype.textContent=(p.t==='v'?'▶ 영상':'◻ 사진')+(g.length>1?' '+(g.indexOf(cur)+1)+'/'+g.length:'');
  if(seqLab)seqLab.textContent=(cur+1)+' / '+PH.length+'   '+(p.d===7?'7월 답사':'10월 본촬영');
  // 자막의 CH 번호. 한때 'CH-04'로 박혀 있어서 어느 컷이든 04 였다
  if(chno)chno.textContent=String(cur+1).padStart(2,'0');
  wake();                                          // 컷이 바뀌면 HUD도 같이 깨어난다
};

// ── 지도를 크게 쓰는 데 맞춰 선과 점을 다시 잡는다 ────────────
//  app.js는 96px짜리 미니맵 기준으로 그린다. 중앙 대형으로 쓰면
//  선이 굵고 점이 덩어리로 보이므로 여기서 줄인다.
(function(){
  // ★path 가 둘이다 — 앞이 7월 보조선, 뒤가 10월 본선.
  //   querySelector 하나만 잡으면 10월 선이 미니맵 굵기(1.3px)로 남는다.
  const mps=document.querySelectorAll('#mmap path');
  mps.forEach((mp,i)=>{
    const july=mps.length>1&&i===0;
    mp.setAttribute('stroke-width',july?'0.5':'0.75');   // non-scaling-stroke라 단위는 px
    mp.setAttribute('opacity',july?'0.3':'0.85');
    mp.setAttribute('stroke','#ece9dd');
  });
  if(typeof mdot!=='undefined'&&mdot)mdot.setAttribute('r','13');
  if(typeof mglow!=='undefined'&&mglow)mglow.setAttribute('r','34');
})();

// ── CRT 셰이더 오버레이 ────────────────────────────────────────
(function(){
  const cvs=document.getElementById('fx');
  if(!cvs)return;
  const gl=cvs.getContext('webgl')||cvs.getContext('experimental-webgl');
  if(!gl){cvs.style.display='none';return;}   // WebGL 없으면 조용히 빠진다

  const VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS=`precision mediump float;
uniform float u_t, u_burst;
uniform vec2 u_res;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float t=u_t*1.6;
  float b=u_burst;

  // 자기 테이프 가로 찢김 — burst가 셀수록 자주, 크게
  float band=hash(vec2(floor(t*9.0),floor(uv.y*14.0)));
  float tear=step(0.90-b*0.35,band);
  float disp=sin(uv.y*70.0+t*14.0)*0.04*tear*(0.35+b);

  float scan=sin(uv.y*u_res.y*1.15)*0.14;

  // RGB 인광 분리. ★가중치는 셋 다 같아야 한다.
  //  분리는 세 채널을 '다른 자리에서' 뽑는 데서 나온다(r 은 +disp, bl 은 -disp*0.8).
  //  거기에 가중치까지 다르게 주면 그건 분리가 아니라 색을 칠하는 것이다.
  //  옛 값 0.60 / 0.38 / 0.66 은 초록을 눌러 주황-시안으로 기울였고, #fx 가
  //  mix-blend-mode:screen 이라 그 색이 사진 위에 그대로 더해졌다.
  //  app.js 의 채널 분리에서 고정 색조를 걷어낸 것과 같은 이유로 중립으로 되돌린다.
  //  0.55 는 옛 세 값의 평균이라 밝기는 그대로다.
  float r=hash(vec2(uv.x+disp,uv.y)*220.0+t*7.0);
  float g2=hash(vec2(uv.x,uv.y)*220.0+t*5.0);
  float bl=hash(vec2(uv.x-disp*0.8,uv.y)*220.0+t*9.0);
  vec3 col=vec3(r,g2,bl)*0.55*(0.09+b*0.30);

  float sn=hash(uv*900.0+t*40.0);
  col+=(sn-0.5)*(0.04+0.18*tear*(0.4+b));

  // 수직 싱크 바
  float vs=smoothstep(0.0,0.05,abs(fract(uv.y-t*0.14)-0.025));
  // 싱크 바도 중립. 옛 vec3(0.15,0.09,0.03) 은 따뜻한 주황을 얹고 있었다
  col=mix(col+vec3(0.09)*(0.5+b),col,vs);

  col-=scan;
  float vig=uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y);
  col*=clamp(pow(16.0*vig,0.32),0.0,1.0);
  gl_FragColor=vec4(max(col,0.0),1.0);
}`;
  function sh(ty,src){const s=gl.createShader(ty);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))console.warn('shader',gl.getShaderInfoLog(s));return s;}
  const pr=gl.createProgram();
  gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));
  gl.linkProgram(pr);gl.useProgram(pr);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const uT=gl.getUniformLocation(pr,'u_t'),uR=gl.getUniformLocation(pr,'u_res'),
        uB=gl.getUniformLocation(pr,'u_burst');

  // 절반 해상도로 그린다. CSS가 늘려주고, 거친 래스터가 오히려 CRT에 맞는다.
  function size(){
    const w=Math.max(2,Math.round(innerWidth/2)),h=Math.max(2,Math.round(innerHeight/2));
    if(cvs.width!==w||cvs.height!==h){cvs.width=w;cvs.height=h;}
  }
  addEventListener('resize',size); size();

  function loop(ts){
    requestAnimationFrame(loop);
    if(!cvs.width||!cvs.height)return;
    gl.viewport(0,0,cvs.width,cvs.height);
    gl.uniform1f(uT,ts*0.001);
    gl.uniform2f(uR,cvs.width,cvs.height);
    gl.uniform1f(uB,Math.max(0,Math.min(1,typeof burst==='number'?burst:0)));  // 실제 전환 신호
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  requestAnimationFrame(loop);
})();
