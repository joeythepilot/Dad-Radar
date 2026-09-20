"""Build offline chart inputs from a directory of Natural Earth GeoJSON files.
Usage: python scripts/prepare-map-data.py /path/to/natural-earth-geojson
See assets/maps/README.md for source URLs and hashes.
"""
import json
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
src = Path(sys.argv[1]); dest = root / 'data' 
W,S,E,N=-135,5,-55,62
# Clip real geographic segments to the chart coverage, preserving every source vertex inside it.
def clipline(line):
 out=[];run=[]
 for a,b in zip(line,line[1:]):
  dx,dy=b[0]-a[0],b[1]-a[1]; lo,hi=0,1
  for p,q in [(-dx,a[0]-W),(dx,E-a[0]),(-dy,a[1]-S),(dy,N-a[1])]:
   if p==0:
    if q<0:lo=2;break
   elif p<0:lo=max(lo,q/p)
   else:hi=min(hi,q/p)
  if lo<=hi:
   c=[round(a[0]+lo*dx,5),round(a[1]+lo*dy,5)];d=[round(a[0]+hi*dx,5),round(a[1]+hi*dy,5)]
   if run and run[-1]!=c:out.append(run);run=[]
   if not run:run=[c]
   run.append(d)
  elif run:out.append(run);run=[]
 if run:out.append(run)
 return out
def clippolygon(points):
 for axis,bound,greater in [(0,W,True),(0,E,False),(1,S,True),(1,N,False)]:
  output=[]
  if not points:return []
  a=points[-1];ia=(a[axis]>=bound if greater else a[axis]<=bound)
  for b in points:
   ib=(b[axis]>=bound if greater else b[axis]<=bound)
   if ia!=ib:
    t=(bound-a[axis])/(b[axis]-a[axis]);output.append([round(a[0]+t*(b[0]-a[0]),5),round(a[1]+t*(b[1]-a[1]),5)])
   if ib:output.append(b[:2])
   a,ia=b,ib
  points=output
 return points

import gzip
j={'bounds':[W,S,E,N],'land':[],'lakes':[],'rivers':[]}
labels=[]
def add(text,kind,x,y,rank=0,**extra):
 if text and x is not None and y is not None and W<=float(x)<=E and S<=float(y)<=N:
  labels.append(dict(text=text.upper(),kind=kind,x=round(315+(float(x)+135)/80*570,4),y=round(45+(62-float(y))/57*560,4),rank=rank,**extra))
for f in json.loads((src/'ne_10m_admin_0_countries.geojson').read_text())['features']:
 g=f['geometry'];p=f['properties'];polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
 rings=[]
 for poly in polys:
  outer=clippolygon(poly[0])
  if len(outer)>2:rings.append([outer]+[r for r in map(clippolygon,poly[1:]) if len(r)>2])
 if rings:
  j['land'].append({'name':p['NAME'],'polygons':rings})
  add(p['NAME_EN'],'country',p['LABEL_X'],p['LABEL_Y'],0)
for f in json.load(open(dest / 'great-lakes-50m.json'))['features']:
 g=f['geometry'];polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
 for poly in polys:
  outer=clippolygon(poly[0])
  if len(outer)>2:j['lakes'].append({'name':f['properties']['name'],'rings':[outer]+[r for r in map(clippolygon,poly[1:]) if len(r)>2]})
for f in json.loads((src/'ne_10m_rivers_lake_centerlines.geojson').read_text())['features']:
 p=f['properties']
 if p['scalerank']>5:continue
 g=f['geometry'];lines=g['coordinates'] if g['type']=='MultiLineString' else [g['coordinates']]
 segs=[s for l in lines for s in clipline(l)]
 if segs:j['rivers'].append({'name':p['name'],'rank':p['scalerank'],'lines':segs})
extra={'Louisville','Columbus','Charlotte','Asheville','Des Moines','Milwaukee','St. Louis','Memphis','Indianapolis','Cincinnati','Cleveland','Detroit','Pittsburgh','Charleston','Nashville','Knoxville','Atlanta','Raleigh','Richmond','Washington,  D.C.'}
for f in json.loads((src/'ne_10m_populated_places.geojson').read_text())['features']:
 p=f['properties'];x,y=f['geometry']['coordinates']
 if p['SCALERANK']<=4 or p['NAME'] in extra:
  add(p['NAME'].replace('Washington,  D.C.','Washington'),'city',x,y,p['SCALERANK'])
for f in json.loads((src/'ne_10m_admin_1_states_provinces.geojson').read_text())['features']:
 p=f['properties']
 if p['adm0_a3'] not in ['USA','CAN','MEX']:continue
 if p['name']=='District of Columbia':continue
 add(p['name_en'] or p['name'],'region',p['longitude'],p['latitude'],1)
# Preserve approved study placements in the ORD–AVL region.
overrides={'ILLINOIS':(-89.2,40.2),'INDIANA':(-86.1,40.7),'OHIO':(-82.7,40.65),'MICHIGAN':(-84.5,43.5),'MISSOURI':(-92.4,38.05),'KENTUCKY':(-86.1,37.15),'TENNESSEE':(-86.25,35.5),'VIRGINIA':(-79.2,37.6),'WEST VIRGINIA':(-80.65,38.7),'NORTH CAROLINA':(-79.75,35.4),'SOUTH CAROLINA':(-80.9,33.6),'ARKANSAS':(-92.4,34.95),'GEORGIA':(-83.9,34.4),'ALABAMA':(-86.85,34.05),'PENNSYLVANIA':(-78.2,41.15),'WISCONSIN':(-90,43.7),'IOWA':(-93,42.3)}
for l in labels:
 if l['kind']=='region' and l['text'] in overrides:
  x,y=overrides[l['text']];l.update(x=315+(x+135)/80*570,y=45+(62-y)/57*560)
for text,x,y,angle in [('Lake Michigan',-86.65,43.2,-76),('Lake Erie',-81.5,42.2,-20),('Lake Ontario',-77.45,43.55,-8),('Lake Superior',-88.5,47.5,0),('Lake Huron',-82.3,44.8,-65),('Gulf of Mexico',-90,24,0),('Caribbean Sea',-74,14,0),('Pacific Ocean',-126,28,-68),('Atlantic Ocean',-65,34,-60)]:add(text,'water',x,y,0,angle=angle)
for text,x,y,angle in [('Appalachian Mountains',-80.3,37.8,-49),('Rocky Mountains',-111,45,-58),('Sierra Nevada',-119,37,-60),('Sierra Madre',-106,26,-62),('Cascade Range',-121.8,45,-78),('Ozark Plateau',-92,36.8,0)]:add(text,'terrain',x,y,2,angle=angle)
for label in labels:
 if label['text']=='ASHEVILLE' and label['kind']=='city':label['permanent']=True
raw=json.dumps(j,separators=(',',':')).encode();(dest/'map-geography.json.gz').write_bytes(gzip.compress(raw,mtime=0))
body=json.dumps(labels,separators=(',',':'),ensure_ascii=True)
(dest/'map-labels.js').write_text('/* Natural Earth geographic labels; provenance: assets/maps/README.md. */\n(function(root,data){if(typeof module==="object"&&module.exports)module.exports=data;else root.dadRadarMapLabels=data;})(typeof globalThis!=="undefined"?globalThis:this,'+body+');\n')
print('Geography',len(raw),'bytes, gzip',(dest/'map-geography.json.gz').stat().st_size,'labels',len(labels))
