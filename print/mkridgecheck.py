import json, math, os, xml.etree.ElementTree as ET
SP='/private/tmp/claude-501/-Users-noe-IdeaProjects-ep-mt-archive/78cd91e9-1448-410a-991f-839f1cb3b61e/scratchpad/'
B=SP+'bnd/'; DEM=SP+'dem/'
Z=14;N=2**Z;TS=256;X0,X1,Y0,Y1=13966,13970,6339,6345
tiles={}
for x in range(X0,X1+1):
    for y in range(Y0,Y1+1):
        f=DEM+f't_{x}_{y}.raw'
        if os.path.exists(f): tiles[(x,y)]=open(f,'rb').read()
W=(X1-X0+1)*TS;H=(Y1-Y0+1)*TS
def ele(lat,lon):
    r=math.radians(lat)
    fx=(lon+180)/360*N*TS-X0*TS
    fy=(1-math.log(math.tan(r)+1/math.cos(r))/math.pi)/2*N*TS-Y0*TS
    ix,iy=int(fx),int(fy)
    if not(0<=ix<W-1 and 0<=iy<H-1):return None
    def raw(a,b):
        t=tiles.get((X0+a//TS,Y0+b//TS))
        if t is None:return None
        o=((b%TS)*TS+(a%TS))*3
        return (t[o]*256+t[o+1]+t[o+2]/256)-32768
    v=[raw(ix+dx,iy+dy) for dx,dy in((0,0),(1,0),(0,1),(1,1))]
    if any(q is None for q in v):return None
    u,t_=fx-ix,fy-iy
    return (v[0]*(1-u)+v[1]*u)*(1-t_)+(v[2]*(1-u)+v[3]*u)*t_
MLAT=111320.0
def mlon(la):return MLAT*math.cos(math.radians(la))
S=json.load(open(B+'bnd_sel.json'));MU=S['muni'];x0,y0,x1,y1=S['bb']
def inside(p,r):
    x,y=p;c=False;j=len(r)-1
    for i in range(len(r)):
        xi,yi=r[i][0],r[i][1];xj,yj=r[j][0],r[j][1]
        if ((yi>y)!=(yj>y)) and (x<(xj-xi)*(y-yi)/(yj-yi+1e-18)+xi):c=not c
        j=i
    return c
def who(p):
    for n,rs in MU:
        if any(inside(p,r) for r in rs):return n
    return '밖'
# 트랙
root=ET.parse('/Users/noe/Downloads/은둘길.gpx').getroot()
tag='{%s}trkpt'%root.tag.split('}')[0].strip('{')
TR=[(float(t.get('lon')),float(t.get('lat'))) for t in root.iter(tag)][::5]
def near_track(p):
    la=p[1];best=9e9
    for q in TR:
        d=math.hypot((q[0]-p[0])*mlon(la),(q[1]-p[1])*MLAT)
        if d<best:best=d
        if best<30:break
    return best

ep=[rs for n,rs in MU if n=='은평구'][0]
ring=max(ep,key=len)
def dist(a,b):return math.hypot((b[0]-a[0])*mlon(a[1]),(b[1]-a[1])*MLAT)
samples=[]
for i in range(1,len(ring)):
    a,b=ring[i-1],ring[i];d=dist(a,b)
    if d==0:continue
    n=max(1,int(d//40))
    for k in range(n):
        t=k/n;p=(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)
        if x0<=p[0]<=x1 and y0<=p[1]<=y1: samples.append((p,(b[0]-a[0],b[1]-a[1]),d/n))

def transect(p,v,R=150,ST=15):
    la,lo=p[1],p[0]
    vx,vy=v[0]*mlon(la),v[1]*MLAT;L=math.hypot(vx,vy)
    if L==0:return None
    nx,ny=-vy/L,vx/L
    out=[]
    for d in range(-R,R+1,ST):
        e=ele(la+ny*d/MLAT, lo+nx*d/mlon(la))
        if e is None:return None
        out.append((d,e))
    return nx,ny,out

def classify(prof,drop):
    c=[e for d,e in prof if d==0][0]
    L=prof[0][1];Rt=prof[-1][1]
    if c-L>=drop and c-Rt>=drop: return '분수령'
    if L-c>=drop and Rt-c>=drop: return '골짜기'
    return '아님'

for DROP in (5,10,15):
    agg={};agg_near={};agg_far={}
    for p,v,seg in samples:
        t=transect(p,v)
        if not t:continue
        nx,ny,prof=t
        k=classify(prof,DROP)
        off=70
        s1=who((p[0]+nx*off/mlon(p[1]),p[1]+ny*off/MLAT))
        s2=who((p[0]-nx*off/mlon(p[1]),p[1]-ny*off/MLAT))
        pair=' / '.join(sorted({s1,s2}-{'은평구'}) or ['?'])
        for A,key in ((agg,pair),):
            A.setdefault(key,{}).setdefault(k,0);A[key][k]+=seg
        tgt = agg_near if near_track(p)<=120 else agg_far
        tgt.setdefault(k,0);tgt[k]+=seg
    print(f'\n########## 양쪽으로 {DROP}m 이상 떨어지면 분수령 ##########')
    for pair,kk in sorted(agg.items(),key=lambda x:-sum(x[1].values())):
        s=sum(kk.values())
        if s<300:continue
        print(f'  {pair:16s} {s/1000:5.2f}km  '+'  '.join(f'{k} {v/s*100:4.1f}%' for k,v in sorted(kk.items(),key=lambda x:-x[1])))
    for nm,A in (('트랙 120m 이내',agg_near),('그 밖',agg_far)):
        s=sum(A.values())
        if s: print(f'  >> {nm:14s} {s/1000:5.2f}km  '+'  '.join(f'{k} {v/s*100:4.1f}%' for k,v in sorted(A.items(),key=lambda x:-x[1])))

print('\n########## 트랙이 경계선 위를 달린 비율 ##########')
root2=ET.parse('/Users/noe/Downloads/은둘길.gpx').getroot()
pts=[(float(t.get('lon')),float(t.get('lat'))) for t in root2.iter(tag)]
def hav(a,b):
    R=6371000;p1,p2=math.radians(a[1]),math.radians(b[1])
    h=math.sin((p2-p1)/2)**2+math.cos(p1)*math.cos(p2)*math.sin(math.radians(b[0]-a[0])/2)**2
    return 2*R*math.asin(math.sqrt(h))
tot=sum(hav(pts[i-1],pts[i]) for i in range(1,len(pts)))
SC=21250/tot
# 경계 샘플점을 격자로 색인
from collections import defaultdict
GR=0.0025
idx=defaultdict(list)
for p,v,seg in samples:
    idx[(int(p[0]/GR),int(p[1]/GR))].append(p)
def dmin(q):
    best=9e9;gx,gy=int(q[0]/GR),int(q[1]/GR)
    for dx in(-1,0,1):
        for dy in(-1,0,1):
            for p in idx.get((gx+dx,gy+dy),()):
                d=math.hypot((p[0]-q[0])*mlon(q[1]),(p[1]-q[1])*MLAT)
                if d<best:best=d
    return best
for TH in (30,50,100):
    acc=0
    for i in range(1,len(pts)):
        if dmin(pts[i])<=TH: acc+=hav(pts[i-1],pts[i])
    print(f'  경계 {TH:3d}m 이내를 달린 거리 : {acc*SC/1000:5.2f}km / 21.25km  ({acc/tot*100:4.1f}%)')
