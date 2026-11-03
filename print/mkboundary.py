import json, math, xml.etree.ElementTree as ET
B='/private/tmp/claude-501/-Users-noe-IdeaProjects-ep-mt-archive/78cd91e9-1448-410a-991f-839f1cb3b61e/scratchpad/bnd/'
OUT='/Users/noe/IdeaProjects/ep_mt_archive/print/'
S=json.load(open(B+'bnd_sel.json')); T=json.load(open(B+'track.json'))
minLat,maxLat,minLon,kx,s=T['k']
def P(lo,la): return ((lo-minLon)*kx,(maxLat-la)*s)
x0,y0,x1,y1=S['bb']
INK='#CD4E37'

root=ET.parse('/Users/noe/Downloads/은둘길.gpx').getroot()
tag='{%s}trkpt'%root.tag.split('}')[0].strip('{')
ll=[(float(t.get('lon')),float(t.get('lat'))) for t in root.iter(tag)]
def hav(a,b):
    R=6371000;p1,p2=math.radians(a[1]),math.radians(b[1])
    h=math.sin((p2-p1)/2)**2+math.cos(p1)*math.cos(p2)*math.sin(math.radians(b[0]-a[0])/2)**2
    return 2*R*math.asin(math.sqrt(h))
cum=[0.0]
for i in range(1,len(ll)): cum.append(cum[-1]+hav(ll[i-1],ll[i]))
sc=21250/cum[-1]; KM=[c*sc/1000 for c in cum]

def inside(pt,r):
    x,y=pt;c=False;j=len(r)-1
    for i in range(len(r)):
        xi,yi=r[i][0],r[i][1];xj,yj=r[j][0],r[j][1]
        if ((yi>y)!=(yj>y)) and (x<(xj-xi)*(y-yi)/(yj-yi+1e-18)+xi): c=not c
        j=i
    return c
def who(pt,areas):
    for n,rs in areas:
        if any(inside(pt,r) for r in rs): return n
    return '밖'
seq=[who(p,S['muni']) for p in ll]
cur=seq[0]; cross=[]; i=1
while i<len(seq):
    if seq[i]!=cur:
        j=i
        while j<len(seq) and seq[j]==seq[i]: j+=1
        if cum[min(j,len(cum)-1)]-cum[i]>=80:
            cross.append((KM[i],ll[i],cur,seq[i])); cur=seq[i]; i=j
        else: i=j
    else: i+=1

def chunks(ring):
    out=[];c=[]
    for lo,la in ring:
        if x0<=lo<=x1 and y0<=la<=y1: c.append(P(lo,la))
        else:
            if len(c)>1: out.append(c)
            c=[]
    if len(c)>1: out.append(c)
    return out
def dstr(ch): return ' '.join('M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in c) for c in ch)
gu=[];dong=[]
for n,rs in S['muni']:
    for r in rs: gu+=chunks(r)
for n,rs in S['sub']:
    for r in rs: dong+=chunks(r)
tr=[P(*p) for p in ll][::15]+[P(*ll[-1])]
trd='M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in tr)

VB=(-40,-40,1080,1661)
MM_H=120.0; MM_W=MM_H*VB[2]/VB[3]
g=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{VB[0]} {VB[1]} {VB[2]} {VB[3]}" width="{MM_W:.1f}mm" height="{MM_H:.1f}mm">',
   f'<!-- 은둘길 21.25km + 행정경계. 투영 = app.js mapXY (등거리원통, D.map.k). 1도 빨강 {INK} -->',
   f'<rect x="{VB[0]}" y="{VB[1]}" width="{VB[2]}" height="{VB[3]}" fill="#F3F3F3" id="paper"/>',
   f'<g id="dong" opacity=".34"><path d="{dstr(dong)}" fill="none" stroke="{INK}" stroke-width="1.6" stroke-dasharray="2 4"/></g>',
   f'<g id="gu"><path d="{dstr(gu)}" fill="none" stroke="{INK}" stroke-opacity=".62" stroke-width="3" stroke-dasharray="11 6"/></g>',
   f'<g id="track"><path d="{trd}" fill="none" stroke="{INK}" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round"/></g>',
   '<g id="cuts">']
for p in T['photos']:
    x,y=P(p['lon'],p['lat']); r=(p['hr']-94)/85
    o=1.0 if r>.6 else (.6 if r>.3 else .3); rad=6 if p['t']=='v' else 4.2
    if p['d']==7: g.append(f'<rect x="{x-rad:.1f}" y="{y-rad:.1f}" width="{2*rad:.1f}" height="{2*rad:.1f}" transform="rotate(45 {x:.1f} {y:.1f})" fill="{INK}" fill-opacity="{o}"/>')
    else: g.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rad}" fill="{INK}" fill-opacity="{o}"/>')
g.append('</g>')
g.append('<g id="crossings">')
for km,(lo,la),a,b in cross:
    x,y=P(lo,la)
    g.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="9" fill="none" stroke="{INK}" stroke-width="2.4"/><!-- {km:.2f}km {a}->{b} -->')
g.append('</g></svg>')
open(OUT+'boundary.svg','w').write('\n'.join(g))
json.dump({'note':'은둘길 트랙 + 행정경계. 투영은 app.js mapXY와 동일(D.map.k). 거리는 FIT 총거리 21.25km로 보정.',
 'k':T['k'],'viewBox':list(VB),'print_mm':[round(MM_W,1),MM_H],'ink':INK,
 'crossings':[{'km':round(k,2),'from':a,'to':b,'lat':la,'lon':lo} for k,(lo,la),a,b in cross],
 'track':[[round(x,1),round(y,1)] for x,y in tr],
 'gu':[[[round(x,1),round(y,1)] for x,y in c] for c in gu],
 'dong':[[[round(x,1),round(y,1)] for x,y in c] for c in dong]},
 open(OUT+'boundary.json','w'),ensure_ascii=False,indent=0)
print(f'크기 {MM_W:.1f} x {MM_H}mm / 트랙 {len(tr)}점 / 구경계 {len(gu)}조각 / 동경계 {len(dong)}조각 / 교차 {len(cross)}')
