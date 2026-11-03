# p6-7 지도 바탕. OSM 타일을 받아 붙이고, 지면 좌표계(= app.js mapXY)에 맞춰 늘린 뒤
# 1도 빨강 톤으로 묽게 깔아준다. 트랙·경계선은 boundary.svg가 위에 얹힌다.
#
#   python3 -I print/mkbasemap.py [zoom]
#
# ★출처 표기 의무 : "지도 © OpenStreetMap contributors" 를 p8에 반드시 넣는다 (ODbL).
# ★타일은 캐시된다. 두 번째부터는 네트워크를 안 탄다.
import json, math, os, re, subprocess, sys, time, urllib.request

OUT = '/Users/noe/IdeaProjects/ep_mt_archive/print/'
CACHE0 = '/private/tmp/claude-501/-Users-noe-IdeaProjects-ep-mt-archive/78cd91e9-1448-410a-991f-839f1cb3b61e/scratchpad/tiles/'
UA = 'ep_mt_archive/1.0 (print mockup, Eunpyeong Mountain Archive; iamsoyeon316@gmail.com)'
SRC = {
  # 이름 : (타일 URL, 출처 표기, 어둡게 뒤집을지)
  'osm':  ('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
           '지도 © OpenStreetMap contributors', False),
  'topo': ('https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
           '지도 © OpenTopoMap (CC-BY-SA) / 데이터 © OpenStreetMap contributors, SRTM', False),
}
NAME = sys.argv[2] if len(sys.argv) > 2 else 'osm'
URL, CREDIT, _ = SRC[NAME]
Z = int(sys.argv[1]) if len(sys.argv) > 1 else 15
# 바탕 세기. 1.0 = 원본 명암 그대로, 0.2 = 아주 묽게
K = float(sys.argv[3]) if len(sys.argv) > 3 else 0.26

B = json.load(open(OUT + 'boundary.json'))
minLat, maxLat, minLon, kx, s = B['k']
VX, VY, VW, VH = B['viewBox']
INK, PAPER = B['ink'], '#F3F3F3'

# 지면 네 모서리 → 경위도
lon0, lon1 = minLon + VX / kx, minLon + (VX + VW) / kx
lat1, lat0 = maxLat - VY / s, maxLat - (VY + VH) / s

N = 2 ** Z * 256
def mx(lon): return (lon + 180) / 360 * N
def my(lat):
    r = math.radians(lat)
    return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * N

px0, px1, py0, py1 = mx(lon0), mx(lon1), my(lat1), my(lat0)
tx0, tx1 = int(px0 // 256), int(px1 // 256)
ty0, ty1 = int(py0 // 256), int(py1 // 256)
nx, ny = tx1 - tx0 + 1, ty1 - ty0 + 1
print(f'z{Z} / 타일 {nx}×{ny} = {nx*ny}개 / 지면 {px1-px0:.0f}×{py1-py0:.0f}px '
      f'= {(px1-px0)/B["print_mm"][0]*25.4:.0f}dpi')

CACHE = CACHE0 + NAME + '/'
os.makedirs(CACHE, exist_ok=True)
got = new = 0
for ty in range(ty0, ty1 + 1):
    for tx in range(tx0, tx1 + 1):
        f = f'{CACHE}{Z}_{tx}_{ty}.png'
        if os.path.exists(f) and os.path.getsize(f) > 500:
            got += 1; continue
        url = URL.format(z=Z, x=tx, y=ty)
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            open(f, 'wb').write(r.read())
        got += 1; new += 1
        time.sleep(.12)          # 타일 서버 예의
print(f'타일 {got}개 (새로 받음 {new})')

# 모자이크 → 지면 bbox 로 crop → 지면 비율로 stretch
# 메르카토르와 등거리원통의 세로 차이는 이 범위에서 0.3px. 그냥 늘려도 된다
rows = []
for ty in range(ty0, ty1 + 1):
    rows.append([f'{CACHE}{Z}_{tx}_{ty}.png' for tx in range(tx0, tx1 + 1)])
MOS = CACHE + f'mosaic_{Z}.png'
cmd = ['magick', '-background', 'white']
for r in rows:
    cmd += ['('] + r + ['+append', ')']
cmd += ['-append', MOS]
subprocess.run(cmd, check=True)

cx, cy = int(px0 - tx0 * 256), int(py0 - ty0 * 256)
cw, ch = int(round(px1 - px0)), int(round(py1 - py0))
# 출력 픽셀 크기는 지면 viewBox 비율 그대로. 가로를 모자이크 해상도에 맞춘다
ow = cw
oh = int(round(cw * VH / VW))

subprocess.run([
    'magick', MOS,
    '-crop', f'{cw}x{ch}+{cx}+{cy}', '+repage',
    '-resize', f'{ow}x{oh}!',
    '-colorspace', 'gray',
    # out = 1 - (1-in)*K. 어두운 곳의 순서는 그대로 두고 전체를 종이 쪽으로 끌어올린다.
    # 레벨/대비로 깎으면 중간톤이 뭉개져서 길과 건물이 한 덩어리가 된다
    '-negate', '-evaluate', 'multiply', str(K), '-negate',
    '+level-colors', f'{INK},{PAPER}',
    OUT + 'basemap.png'
], check=True)
print('출처 표기 :', CREDIT)
print(f'세기 K={K}')
print('basemap.png', subprocess.run(['magick','identify','-format','%wx%h %b',OUT+'basemap.png'],
                                    capture_output=True, text=True).stdout)

# 직접 그렸던 구 면·지명 레이어는 걷어낸다 (이제 바탕이 진짜 지도다)
svg = open(OUT + 'boundary.svg', encoding='utf-8').read()
svg = re.sub(r'<defs><clipPath id="vb">.*?</g>(?=\n<g id="dong")', '', svg, flags=re.S)
svg = re.sub(r'<g id="names".*?</g>(?=</svg>)', '', svg, flags=re.S)
# 바탕이 생겼으니 종이색 사각형도 뺀다 (지도를 가린다)
svg = re.sub(r'<rect [^>]*id="paper"/>', '', svg)
open(OUT + 'boundary.svg', 'w', encoding='utf-8').write(svg)
print('boundary.svg 레이어', re.findall(r'<g id="(\w+)"', svg))
