#!/bin/bash
# 원본 → web/ 변환.  bash setup.sh [원본폴더...]
#   폴더를 여러 개 줄 수 있다. 기본값 media/ .
#   예: bash setup.sh media ~/studio-noe/ep_mt_archive/ep_mt_archive_media
#       (media/ = 7월 답사 TC_ 원본, 바깥 폴더 = 10월 본촬영 IMG_ 원본)
cd "$(dirname "$0")"
SRCS=("$@"); [ ${#SRCS[@]} -eq 0 ] && SRCS=(media)
FLY_SRC="17930878237258.71.MP4"   # COROS 플라이오버 원본 (22.41초)
mkdir -p web
shopt -s nullglob nocaseglob
pc=0; vc=0; fc=0
for SRC in "${SRCS[@]}"; do
  [ -d "$SRC" ] || { echo "✗ 원본 폴더 없음: $SRC"; exit 1; }
  echo "▶ $SRC — 사진 변환 → web/*.jpg"
  for f in "$SRC"/IMG_*.jpg "$SRC"/IMG_*.jpeg "$SRC"/IMG_*.png "$SRC"/TC_*.jpg "$SRC"/TC_*.jpeg "$SRC"/TC_*.png; do
    b=$(basename "$f"); n="${b%.*}"
    if command -v magick >/dev/null 2>&1; then magick "$f" -auto-orient -resize 1600x "web/${n}.jpg"
    elif command -v convert >/dev/null 2>&1; then convert "$f" -auto-orient -resize 1600x "web/${n}.jpg"
    else cp "$f" "web/${n}.jpg"; fi
    pc=$((pc+1))
  done
  echo "▶ $SRC — 영상 변환 → web/*.mp4 (720p 무음)"
  for f in "$SRC"/IMG_*.mov "$SRC"/IMG_*.mp4 "$SRC"/TC_*.mov "$SRC"/TC_*.mp4; do
    b=$(basename "$f"); n="${b%.*}"
    if command -v ffmpeg >/dev/null 2>&1; then
      ffmpeg -y -loglevel error -i "$f" -vf "scale=-2:720" -an -c:v libx264 -crf 28 -movflags +faststart "web/${n}.mp4"
      vc=$((vc+1))
    else echo "  ⚠ ffmpeg 없음 — 영상 변환 불가"; break; fi
  done
done
SRC="${SRCS[0]}"
for d in "${SRCS[@]}"; do [ -e "$d/$FLY_SRC" ] && SRC="$d"; done
echo "▶ 플라이오버 변환 ($FLY_SRC → web/flyover.mp4, 720p 무음)"
if [ -e "$SRC/$FLY_SRC" ] && command -v ffmpeg >/dev/null 2>&1; then
  ffmpeg -y -loglevel error -i "$SRC/$FLY_SRC" -vf "scale=-2:720" -an -c:v libx264 -crf 30 -movflags +faststart web/flyover.mp4
  fc=1
fi
[ "$fc" = "1" ] && echo "  ✓ web/flyover.mp4" || echo "  ⚠ $SRC/$FLY_SRC 없음 — 인트로 배경 비활성(검정 폴백)"
# 데이터(app.js)에 없는 변환본은 지운다 — 원본 폴더엔 코스 밖 컷도 섞여 있다
echo "▶ 데이터에 없는 변환본 정리"
oc=0
for f in web/*.jpg web/*.mp4; do
  b=$(basename "$f"); n="${b%.*}"
  [ "$b" = "flyover.mp4" ] && continue
  grep -q "\"$n\"" app.js || { rm -f "$f"; oc=$((oc+1)); }
done
echo "  ✓ $oc개 정리"
echo ""
echo "✅ 사진 $pc개 / 영상 $vc개 / 플라이오버 $fc개 변환, $oc개 정리 → web/ 완료"
echo "▶ 로컬 서버:  python3 -m http.server 8000   →   http://localhost:8000/"
