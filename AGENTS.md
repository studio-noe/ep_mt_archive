# Eunpyeong Mountain Archive — Codex 인수인계

> 인쇄 기록집(150p)의 QR 목적지가 되는 인터랙티브 웹.
> 은평구 산 문화콘텐츠 기록 프로그램(은평로컬기록가 2기)의 웹 부속물.
> 저장소: `noe316/ep_mt_archive` · 배포: **https://noe316.github.io/ep_mt_archive/**
> 제작자: NOE (노에) — 웹 퍼블리셔 겸 트레일러너. 대화는 한국어.

이 문서는 이전 세션(웹 채팅)에서 이 사이트를 처음부터 만든 전체 맥락. Codex는 이걸 읽고 이어받으면 됨. **다음 작업은 §8 카메라 모션트래킹.**

---

## 0. 작업 방식 (Codex)

- 로컬 저장소를 **직접 편집** (`/Users/noe/IdeaProjects/ep_mt_archive`).
- **JS 수정 후 반드시 문법 검증**: `node -e "new Function(require('fs').readFileSync('app.js','utf8'))"`. (과거 replace 실수로 스크립트가 통째로 깨진 적 있음 — 꼭 검증.)
- **`git push`는 사용자(NOE)가 직접** 실행. 커밋 메시지 제안은 해도 됨.
- 로컬 확인은 `python3 -m http.server 8000` → `http://localhost:8000/`. **`file://` 금지**(canvas taint + 영상 자동재생 막힘).
- 미디어 원본(5MB×84)은 무겁다 — 코드/데이터만 다루고, 변환·배포는 사용자가.
- 별도로 `HANDOFF.md`(노트북↔폰 오갈 때 쓰는 짧은 워크플로 노트)가 있음. 이 AGENTS.md는 종합 맥락, HANDOFF.md는 세션 간 단기 메모.

---

## 1. 컨셉 / 주제

**"연속을, 자르다" → "하나의 산을, 다시 잇기".**
은평의 산은 원래 하나로 이어진 능선인데, 사람은 그걸 행정동·둘레길 코스·은평/고양 경계로 잘라 놓았다. 러너는 그 잘린 산을 달려서 다시 한 줄로 잇는다.

시각 언어 = **글리치/왜곡/흔들림**. 러너의 흔들리는 몸 = 흔들린 기록. 핵심 장치: **심박(HR)이 글리치 강도를 몬다** — 힘든 구간일수록 화면이 더 찢어짐.

기록의 정체성(인쇄물·웹 공통):
- **잘 찍은 산 사진이 아니라, 산을 통과한 한 몸의 로그.**
- 모든 조각이 실제 좌표·시각·심박을 가짐 (감성 배치 아님).
- 흔들림·촬영밀도·여백까지 전부 몸의 상태를 말함.

두 개의 시선(중요한 대비):
- **몸의 시선** = 흔들리는 TC 사진/영상. 발밑, 잘림, 경계를 모름.
- **지도의 시선** = 매끄러운 항공 플라이오버. 위에서, 경계를 앎.

디자인 이력(왜 지금 형태인지): 초기 추상 flow-field 버전들 → "갤러리 같다/안 예쁘다"로 폐기. 사진이 주인공, 데이터는 속삭임. 갤러리로 안 보이게 하단 능선(고도)선 추가.

---

## 2. 저장소 구조

```
ep_mt_archive/
├── index.html          # 껍데기: 폰트/카카오 SDK 로드, 인트로 DOM, canvas/HUD/능선 DOM, app.js 로드
├── app.js              # 앱 전체 (86.7KB) = 상단 데이터 blob + 글리치 엔진 코드
├── styles.css          # 스타일 전부
├── setup.sh            # media/ 원본 → web/ 변환 (사진/영상/플라이오버)
├── media/              # 원본 (.JPG/.MOV) + flyover-*.MP4. 용량 큼
├── web/                # 변환본: TC_xxxxx.jpg / .mp4, flyover.mp4 — 배포에 실제 필요
├── HANDOFF.md          # 노트북↔폰 단기 워크플로 노트
├── AGENTS.md           # (이 파일) 종합 인수인계
└── 은둘길_글리치_v2.html  # 옛 단일파일 버전(참고용, 미사용)
```

`app.js` 상단: `const D={photos:[...84], prof:[[km,ele]×23], total:22.89}` → 이어서 플라이오버 7개 push + `const PH=D.photos.slice().sort(by km)`. 데이터는 코드에 인라인.

미디어는 **상대경로** `web/TC_xxxxx.jpg` · `.mp4` · `web/flyover.mp4`. (GitHub Pages가 `/ep_mt_archive/` 하위경로라 상대경로 필수.)

---

## 3. 데이터 (전부 실측)

### 러닝 트랙
- **은둘길 단축, 2026-07-12** (COROS Trail Run, labelId `478841828779524298`)
- **22.89km · 5h22m**(이동 4:52) · 06:12→11:34 (KST) · 트랙 시각은 **UTC** 저장
- 평균심박 155 · 최고 180 · 최저 111 · 고도 40–232m · 누적상승 975m
- GPX 초당 14,841 포인트. 재매칭 필요 시 `478841828779524298.gpx` 사용

### 미디어 (84개 TC_)
- iPhone **TimeStamp Camera** 앱. 사진 56(.JPG) + 영상 28(.MOV). 번호 TC_00002–00087(55,74 결번)
- **타임존**: 사진 EXIF = **KST**, 영상 QuickTime = **UTC**. 트랙은 UTC. 매칭 시 통일 필수
- **위치 = 실제 촬영시각을 트랙과 대조**해 부여 (km/lat/lon/ele/hr). 84개 전부 정확(초기 39개 번호추정은 폐기됨)
- 촬영시각 추출: `GetFileInfo -d`(JPG, KST) / `ffprobe creation_time`(MOV, UTC)
- **밀도는 실제 리듬**: 초반 0~4km에 51컷 몰림(천천히 워밍업하며 많이 찍음), 뒤로 성겨짐. 버그 아님
- 런 이후 `IMG_` 파일들은 코스 밖 → 제외

각 photo 객체: `{n:"TC_00059", t:"p"|"v"|"f", km, hr, ele, lat, lon}`. `t:'f'`는 플라이오버 가상 컷(§6).

---

## 4. 아키텍처 (app.js)

### 글리치 렌더 엔진 (canvas)
매 프레임 현재 미디어를 canvas에 그리며 합성:
- 컬러 그레이드 + **RGB 채널 분리**(redC `#ff4a1e`/cyanC `#26dcff`, multiply 틴트 오프스크린을 `lighter`로 offset 합성) + 가로 슬라이스 찢김 + 블록 데이터모시 + 흔들림 + 스캔라인 플리커 + 수직 싱크롤(버스트)
- **강도 = HR 기반**: `I = intensity*0.1 + burst*0.9`. 평상시 0.1, 전환 시 `burst=1`이 프레임당 0.033 감쇠 → **~0.5초에 선명**. ★최종 튜닝값(NOE 직접 맞춤): "전환 파바박, 초점 0.5초, 평상시 0.1"
- 사진=`<img>`, 영상=재사용 `<video>`(muted/loop/playsinline) 매프레임 draw
- `drawCover()` = object-fit:cover **센터 크롭**. 소스 대부분 세로(9:16)
- 로드 실패 → 임베드 base64 샘플 fallback

### 하단 능선선 + 마커 (★함정)
- 고도 프로파일 = **풀폭 SVG**(viewBox 0 0 1000 100, preserveAspectRatio=none, width:100%). 뒤에 딤(`.rdgbg`)
- 컷 = 능선선 위 점, 색 = HR(`hrHex`: >0.6 berry/>0.3 amber/else moss). 점·마커는 `rEleAt(km)`로 선 위에 정확히 앉힘
- **현재위치 마커는 SVG가 아니라 DOM div**(`.rmarker`, `left = clientX px`). ★★ SVG viewBox 매핑이 클릭과 어긋나서 픽셀좌표로 직접 얹음. **절대 SVG 마커로 되돌리지 말 것**
- 클릭/드래그: 마커=정확한 클릭x, 사진=그 km 최근접 컷. 자동재생 3.2초

### HUD / 지오코딩
- 큰 좌표(실제 GPS, Space Mono, 글리치 text-shadow) + 주소(구·동) + km/HR/고도/타입 + 파일명
- **역지오코딩 = 카카오** `coord2regioncode(lng,lat)` → region_type 'H'의 `region_2depth+region_3depth`. ★(경도,위도) 순서. 300ms 디바운스+캐시. (Nominatim은 한국 동 부정확 → 교체. "향동을 은평구로" 오표기가 이유)
- **카카오 JS 키가 index.html에 박혀 public repo 노출** → 방어막은 도메인 제한. 카카오 Web 도메인에 `https://noe316.github.io` + `http://localhost:8000` 등록돼 있어야 주소 뜸

### 폰트 / 팔레트 / 타이틀
- Gasoek One(타이틀) · Space Mono(데이터/좌표) · Gowun Batang(주소). Archivo Black/Hahmlet/Signika도 로드(미사용)
- ink `#0a0f0c` · mist `#ece9dd` · amber `#f0a23c` · berry `#cf4b34`
- 인트로 타이틀: **Eunpyeong / Mountain / Archive** (3줄, Archive만 berry)

---

## 5. setup.sh (media → web)

```bash
bash setup.sh   # media/ 와 같은 위치에서
```
- 사진: magick resize 1600x → `web/*.jpg`
- 영상: ffmpeg scale=-2:720, `-an`, libx264 crf28, faststart → `web/*.mp4`
- 플라이오버: `media/flyover*.MP4` → `web/flyover.mp4` (720p, crf30, 무음). 43MB→**2MB**
- 없으면 조용히 스킵(검정 인트로로 폴백)

---

## 6. 플라이오버 (완성됨)

`media/flyover-*.MP4` (47초·세로 1080×1920·무음·43MB→2MB). 다크모드 3D 지도 위를 코스 전체가 그려지며 나는 영상("Share Aura" 앱). **화면에 km 카운터 있음**(GPS 메타데이터는 없음).

### (1) 인트로 배경
`index.html` 인트로에 `<video class="ibg" ...src="web/flyover.mp4">` + `<div class="idim">`. CSS: grayscale+contrast, opacity .5, 라디얼 딤.

### (2) 4.13km 공백 채움 (18.76→22.89km, TC 미촬영)
`D.photos`에 가상 컷 7개(`FLYOVER_01–07`, `t:'f'`) 실좌표 삽입. `D.gap=[18.76,22.89]`.
- HUD: **"기록 없음"** / **"▲ 지도의 시선"**
- 능선: 슬레이트 밴드 `rgba(125,155,181,.13)` + 속 빈 원 점(stroke `#7d9bb5`)
- ★**핵심 의미**: 그 구간 실제 HR = 161·169·168. **몸은 거기 있었는데 기록만 없다.** HR 유지가 포인트
- `applySource`에 **src 재사용 가드**(`vid.dataset.cur`): 7개가 같은 영상, 리로드 없이 재생

### (3) km↔시간 동기화 (최근 작업)
영상 km 카운터를 **프레임별 OCR**해 실측한 선형식:
```
km = 0.575·t − 1.73     →     t = 1.739·km + 3.01
```
(0km=3.0초, 23km=43.0초. 12점 중 11점 소수점까지 일치). 코드: `FLY_A=1.7391, FLY_B=3.009, FLY_RATE=0.38`, `flyTime(km)`, `syncFly(p)`.
- 공백 컷마다 영상을 해당 km 시점으로 **시킹** → 위치 맞는 항공뷰
- **드래그하면 지도도 같이 스크럽**
- 재생속도 0.38× — 컷 간격을 자동넘김 3.2초에 맞춤 + 지도의 시선이 몸의 시선보다 느리고 매끄러운 대비

---

## 7. 배포 / 확인

1. 사용자가 `bash setup.sh`로 web/ 생성 (flyover 포함)
2. `python3 -m http.server 8000` 로컬 확인
3. 카카오 Web 도메인 등록 확인 (안 하면 주소 "—")
4. `git add . && git commit && git push` — **사용자가 직접**
5. 배포 후 `https://noe316.github.io/ep_mt_archive/` 확인

---

## 8. ▶ 다음 작업: 카메라 모션트래킹 (NOE 요청)

NOE가 **카메라로 관람자 움직임을 추적**해 인터랙션에 넣고 싶어함. "심박→글리치 강도" 파이프라인에 "관람자 몸→글리치 강도"를 합류시키는 구조로 녹이는 게 핵심.

**추적 대상 후보**: 손(MediaPipe Hands) / 얼굴(FaceMesh) / 전신(Pose) / 옵티컬 플로우(프레임 차분, 라이브러리 0).

**매핑 후보**: 움직임→글리치 강도(심박 채널 합류) / 손·머리 위치→능선 스크럽 / **움직임→공백구간 해금** / 관람자 실루엣을 러너 사진에 글리치 합성.

**제안한 조합 3개**:
1. **손 스크럽** (MediaPipe Hands) — 손 좌우로 능선 훑기, 주먹으로 글리치 버스트. QR 관람 친화
2. **움직임=왜곡** (옵티컬 플로우, 초경량) — 가만있으면 선명, 움직이면 찢어짐. 심박 글리치에 그대로 합류. "몸의 시선"을 관람자 몸으로 잇는 순수 버전
3. **몸으로 잇는 공백** (Pose/플로우) — 마지막 4.13km 공백을 **관람자가 움직여야** 플라이오버+심박이 열림. 프로젝트 최강 지점(부재의 심박)을 인터랙션으로 완성

**필수 고려**: `getUserMedia`는 iOS에서 **사용자 제스처 안에서** 호출("기록 속으로" 버튼 시점). 프라이버시 고지("영상은 기기 내 처리, 전송 안 함"). MediaPipe 모델 로딩 1~2초, 플로우는 즉시.

**미결정**: 어느 조합으로 갈지 NOE와 확정 후 구현. (추천: ②가 시스템에 제일 매끄럽게 녹고, ③이 주제적으로 제일 셈.)

---

## 9. 인쇄물 연계 (웹 결정 시 참고)

- **150p 기록집** 안에 **아코디언(병풍접지) 폴드아웃 한 페이지**로 22.9km 능선 띠를 펼침. 접힘=잘린 산, 펼침=이어진 산 → 형태가 주제를 연기
- 웹의 능선선/촬영밀도/공백여백이 종이로 넘어감. 웹·인쇄물이 같은 데이터 언어 공유하도록 유지
- 폼 답변(주제) 방향: "은평의 산을 달리며, 흩어진 기록으로 '하나의 산'을 다시 잇는다"

---

## 10. 함정 모음 (재실수 방지)

- **클릭 정렬 = DOM 픽셀 마커**(`.rmarker`). SVG 마커로 되돌리지 말 것
- **카카오 coord2regioncode = (경도, 위도)** 순서
- **타임존**: 사진 KST / 영상·트랙 UTC
- **JS 수정 후 문법 검증** 필수 (`new Function`)
- **`file://` 금지** → 반드시 `http.server`
- **git push는 사용자 몫**
- 카카오 JS 키 노출 → 도메인 제한이 방어막
- 미디어 원본 무거움 → 컨텍스트로 끌어오지 말 것
- 데이터(D blob)는 코드 인라인 — `const D=` ~ `const PH=` 경계 조심
