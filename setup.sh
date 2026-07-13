#!/bin/bash
# mt_archive 폴더 안(= media/ 와 같은 위치)에 두고 실행:  bash setup.sh
cd "$(dirname "$0")"
mkdir -p web
shopt -s nullglob nocaseglob
pc=0; vc=0
echo "▶ 사진 변환 (media/TC_*.JPG → web/*.jpg)"
for f in media/TC_*.jpg media/TC_*.jpeg media/TC_*.png; do
  [ -e "$f" ] || continue
  b=$(basename "$f"); n="${b%.*}"
  if command -v magick >/dev/null 2>&1; then magick "$f" -resize 1600x "web/${n}.jpg"
  elif command -v convert >/dev/null 2>&1; then convert "$f" -resize 1600x "web/${n}.jpg"
  else cp "$f" "web/${n}.jpg"; fi
  pc=$((pc+1))
done
echo "▶ 영상 변환 (media/TC_*.MOV → web/*.mp4, 720p 무음)"
for f in media/TC_*.mov media/TC_*.mp4; do
  [ -e "$f" ] || continue
  b=$(basename "$f"); n="${b%.*}"
  if command -v ffmpeg >/dev/null 2>&1; then
    ffmpeg -y -loglevel error -i "$f" -vf "scale=-2:720" -an -c:v libx264 -crf 28 -movflags +faststart "web/${n}.mp4"
    vc=$((vc+1))
  else echo "  ⚠ ffmpeg 없음 — 영상 변환 불가"; fi
done
echo ""
echo "✅ 사진 $pc개 · 영상 $vc개 → web/ 생성 완료"
echo "▶ 이제 로컬 서버 실행:  python3 -m http.server 8000"
echo "▶ 브라우저에서:  http://localhost:8000/"
