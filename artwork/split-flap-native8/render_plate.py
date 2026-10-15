"""Offline physical metalwork authoring. Application consumes only the PNG."""
from pathlib import Path
import json,sys,math
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from scipy.ndimage import gaussian_filter,distance_transform_edt
from shapely.geometry import box,Point,Polygon
from shapely.ops import unary_union
from shapely import constrained_delaunay_triangles
import mitsuba as mi
mi.set_variant('llvm_ad_rgb')
R=Path(__file__).resolve().parent
profile=sys.argv[1] if len(sys.argv)>1 else 'landscape'
preview='--preview' in sys.argv
g=json.loads((R/'approved-geometry.json').read_text())[profile]
W=g['bay']['width'];H=g['bay']['height']+6;U=.025
body=g['body'];f=g['fit'];left=f['x']+body[0]*f['scale'];top=3+f['y']+body[1]*f['scale'];bw=(body[2]-body[0])*f['scale'];bh=(body[3]-body[1])*f['scale']
# Original full body and all four actual live apertures, with no drum fitting.
radius=10 if profile=='landscape' else 4
outer=box(left+radius,H-top-bh+radius,left+bw-radius,H-top-radius).buffer(radius,quad_segs=16)
holes=[box(t['x'],H-(t['y']+3+t['height']),t['x']+t['width'],H-(t['y']+3)) for t in g['holes']]
full=outer.difference(unary_union(holes));bevel=1.8 if profile=='landscape' else .65
front=outer.buffer(-bevel,join_style=2).difference(unary_union([p.buffer(bevel,join_style=2) for p in holes]))
TW=math.ceil(W*8);TH=math.ceil(H*8)
rng=np.random.default_rng(1062 if profile=='landscape' else 1063)
noise=rng.standard_normal((TH,TW)).astype('float32')
fine=gaussian_filter(noise,1.25);fine/=fine.std()
medium=gaussian_filter(noise,3.6);medium/=medium.std()
micro=gaussian_filter(noise,.55);micro/=micro.std()
creases=gaussian_filter(noise,4.0);creases/=creases.std()
height=(np.exp(-np.square(np.sin(creases*2.2)/.34))+.12*medium+.025*micro).astype('float32')
# Unique full-plate coating, not a photograph stretched or tiled across the face.
mi.Bitmap(height).write(str(R/(profile+'-coating.exr')))
mask=Image.new('L',(TW,TH));d=ImageDraw.Draw(mask)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',round((10.4 if profile=='landscape' else 4.6)*8))
for text,t in zip(['FLIGHT','FROM','TO','STATUS'],g['holes']):
 cy=t['y']+3-(12 if profile=='landscape' else 9.4)
 d.text(((t['x']+t['width']/2)*8,cy*8),text,font=font,fill=255,anchor='mm')
a=np.asarray(mask,dtype='float32')/255
base=np.stack([np.full_like(a,.003),np.full_like(a,.0035),np.full_like(a,.004)],axis=-1)
ink=np.array([.84,.78,.65],dtype='float32')
# Tiny natural density variation; lettering remains crisp and legible.
albedo=base*(1-a[:,:,None])+ink*a[:,:,None]*(.985+micro[:,:,None]*.006)
mi.Bitmap(albedo.astype('float32')).write(str(R/(profile+'-ink-coating.exr')))
brush=gaussian_filter(noise,(.45,3.2));brush/=brush.std()
mi.Bitmap(brush.astype('float32')).write(str(R/(profile+'-brushed-metal.exr')))
patina=gaussian_filter(noise,22);patina/=patina.std();patina=np.clip(.82+.14*patina,.3,1).astype('float32')
mi.Bitmap(patina[:,:,None]*np.array([1,.76,.43],dtype='float32')).write(str(R/(profile+'-patina.exr')))
T=mi.ScalarTransform4f
black={'type':'bumpmap','scale':.005,'texture':{'type':'bitmap','filename':str(R/(profile+'-coating.exr')),'raw':True,'wrap_mode':'clamp'},'bsdf':{'type':'roughplastic','distribution':'ggx','alpha':.12,'int_ior':1.48,'diffuse_reflectance':{'type':'bitmap','filename':str(R/(profile+'-ink-coating.exr')),'raw':True,'wrap_mode':'clamp'}}}
edge={'type':'roughconductor','eta':{'type':'rgb','value':[.444,.527,1.094]},'k':{'type':'rgb','value':[3.695,2.765,1.829]},'alpha':.24,'specular_reflectance':{'type':'rgb','value':[1,.76,.43]}}
# Localized edge wear exposes metal in the actual paint material.
bodymask=Image.new('L',(TW,TH));bm=ImageDraw.Draw(bodymask)
bm.rounded_rectangle((left*8,top*8,(left+bw)*8,(top+bh)*8),radius=radius*8,fill=255)
for h in g['holes']:bm.rectangle((h['x']*8,(h['y']+3)*8,(h['x']+h['width'])*8,(h['y']+3+h['height'])*8),fill=0)
distance=distance_transform_edt(np.asarray(bodymask)>0)/8
patches=gaussian_filter(noise,12);patches/=patches.std()
wear=((distance<.4)&(patches>1.5)).astype('float32')
mi.Bitmap(wear).write(str(R/(profile+'-edge-wear.exr')))
black={'type':'blendbsdf','weight':{'type':'bitmap','filename':str(R/(profile+'-edge-wear.exr')),'raw':True,'wrap_mode':'clamp'},'bsdf_0':black,'bsdf_1':edge}
brass={'type':'roughconductor','eta':{'type':'rgb','value':[.444,.527,1.094]},'k':{'type':'rgb','value':[3.695,2.765,1.829]},'alpha':.24,'specular_reflectance':{'type':'bitmap','filename':str(R/(profile+'-patina.exr')),'raw':True,'wrap_mode':'clamp'}}
brass={'type':'bumpmap','scale':.00008,'texture':{'type':'bitmap','filename':str(R/(profile+'-brushed-metal.exr')),'raw':True,'wrap_mode':'clamp'},'bsdf':brass}
dark={'type':'roughplastic','alpha':.3,'diffuse_reflectance':{'type':'rgb','value':[.006,.006,.005]}}
scene={'type':'scene','integrator':{'type':'path','max_depth':5,'hide_emitters':True}}
def write_mesh(name,verts,faces,material):
 p=R/(profile+'-'+name+'.obj')
 with p.open('w') as out:
  for x,y,z in verts:out.write(f'v {x*U:.9f} {y*U:.9f} {z*U:.9f}\n')
  for x,y,z in verts:out.write(f'vt {x/W:.9f} {y/H:.9f}\n')
  for face in faces:out.write('f '+' '.join(f'{i+1}/{i+1}' for i in face)+'\n')
 return {'type':'obj','filename':str(p),'face_normals':True,'bsdf':material}
def surface(poly,z,name,material,zfun=None):
 verts=[];faces=[]
 for tri in constrained_delaunay_triangles(poly).geoms:
  q=list(tri.exterior.coords)[:3]
  if not tri.exterior.is_ccw:q=q[::-1]
  inds=[]
  for x,y in q:inds.append(len(verts));verts.append((x,y,zfun(x,y) if zfun else z))
  faces.append(inds)
 return write_mesh(name,verts,faces,material)
def bridge(a,b,za,zb,name,material):
 aa=list(a.coords)[:-1];bb=list(b.coords)[:-1]
 n=max(len(aa),len(bb))
 assert len(aa)==len(bb),'Offset rings must preserve every corner'
 if a.is_ccw!=b.is_ccw:bb=bb[::-1]
 bb=min([bb[i:]+bb[:i] for i in range(n)],key=lambda c:sum((x-u)**2+(y-v)**2 for (x,y),(u,v) in zip(aa,c)))
 v=[(x,y,za) for x,y in aa]+[(x,y,zb) for x,y in bb];faces=[]
 for i in range(n):j=(i+1)%n;faces.extend([[i,j,n+j],[i,n+j,n+i]])
 for face in faces:
  p0,p1,p2=[v[k] for k in face]
  if (p1[0]-p0[0])*(p2[1]-p0[1])-(p1[1]-p0[1])*(p2[0]-p0[0])<0:face.reverse()
 return write_mesh(name,v,faces,material)
scene['face']=surface(front,2.2,'face',black)
scene['outer-ease']=bridge(outer.buffer(-.25,join_style=2).exterior,outer.buffer(-bevel,join_style=2).exterior,1.25,2.2,'outer-ease',black)
scene['outer-lip']=bridge(outer.exterior,outer.buffer(-.25,join_style=2).exterior,1.1,1.25,'outer-lip',edge)
scene['body-side']=bridge(outer.exterior,outer.exterior,0,1.1,'body-side',dark)
for i,h in enumerate(holes):
 scene['hole-ease'+str(i)]=bridge(h.buffer(.25,join_style=2).exterior,h.buffer(bevel,join_style=2).exterior,1.25,2.2,'hole-ease'+str(i),black)
 scene['hole-lip'+str(i)]=bridge(h.exterior,h.buffer(.25,join_style=2).exterior,1.1,1.25,'hole-lip'+str(i),edge)
 scene['hole-wall'+str(i)]=bridge(h.exterior,h.exterior,0,1.1,'hole-wall'+str(i),dark)
# Four genuine slotted screw heads, each with its own slot orientation.
r=6.7 if profile=='landscape' else 3.2
centers=[(left+15,top+14),(left+bw-15,top+14),(left+15,top+bh-14),(left+bw-15,top+bh-14)] if profile=='landscape' else [(left+7.5,top+7.5),(left+bw-7.5,top+7.5),(left+7.5,top+bh-7.5),(left+bw-7.5,top+bh-7.5)]
for i,((cx,cy),angle) in enumerate(zip(centers,[-42,31,43,-30])):
 cy=H-cy
 collar_outer=Point(cx,cy).buffer(r+2.5,quad_segs=48);collar_top=Point(cx,cy).buffer(r+1.3,quad_segs=48);collar_inner=Point(cx,cy).buffer(r+.25,quad_segs=48)
 scene['collar-face'+str(i)]=surface(collar_top.difference(collar_inner),3.1,'collar-face'+str(i),dark)
 scene['collar-outer'+str(i)]=bridge(collar_outer.exterior,collar_top.exterior,2.25,3.1,'collar-outer'+str(i),dark)
 scene['collar-inner'+str(i)]=bridge(collar_inner.exterior,Point(cx,cy).buffer(r,quad_segs=48).exterior,3.1,2.65,'collar-inner'+str(i),dark)
 scene['collar'+str(i)]={'type':'cylinder','p0':[cx*U,cy*U,2.15*U],'p1':[cx*U,cy*U,2.55*U],'radius':(r+1.45)*U,'bsdf':dark}
 # Sphere cap triangulation with an actual cut slot; no painted slot illusion.
 circle=Point(cx,cy).buffer(r,quad_segs=48)
 from shapely.affinity import rotate
 slot=rotate(box(cx-r-1,cy-r*.105,cx+r+1,cy+r*.105),angle,origin=(cx,cy))
 cap=circle.difference(slot)
 # Add evenly spaced vertices so the domed highlight follows a real curved head.
 pts=[]
 for y in np.arange(cy-r,cy+r,r/12):
  for x in np.arange(cx-r,cx+r,r/12):
   if cap.contains(Point(x,y)):pts.append(Point(x,y))
 from shapely.ops import triangulate
 verts=[];faces=[];vertex_ids={}
 for t in triangulate(unary_union([cap.boundary,*pts])):
  if not cap.covers(t.representative_point()) or t.intersection(slot).area>1e-6:continue
  q=list(t.exterior.coords)[:3]
  if not t.exterior.is_ccw:q=q[::-1]
  idx=[]
  for x,y in q:
   key=(x,y)
   if key not in vertex_ids:
    vertex_ids[key]=len(verts);verts.append((x,y,2.65+1.6*math.sqrt(max(0,1-((x-cx)**2+(y-cy)**2)/r**2))))
   idx.append(vertex_ids[key])
  faces.append(idx)
 scene['head'+str(i)]=write_mesh('head'+str(i),verts,faces,brass)
 scene['head'+str(i)]['face_normals']=False
 scene['slot'+str(i)]=surface(circle.intersection(slot),2.6,'slot'+str(i),dark)
width=round(W*(2 if preview else 8));height_px=round(width*H/W)
scene['sensor']={'type':'orthographic','to_world':T.look_at(origin=[W*U/2,H*U/2,30],target=[W*U/2,H*U/2,0],up=[0,1,0])@T.scale([W*U/2,W*U/2,1]),'sampler':{'type':'independent','sample_count':32},'film':{'type':'hdrfilm','width':width,'height':height_px,'pixel_format':'rgba','rfilter':{'type':'tent'}}}
scene['environment']={'type':'constant','radiance':{'type':'rgb','value':[.08,.08,.08]}}
scene['key']={'type':'rectangle','to_world':T.look_at(origin=[W*U*.5,H*U+3,2.5],target=[W*U/2,H*U/2,0],up=[0,1,0])@T.scale([W*U*.55,.7,1]),'emitter':{'type':'area','radiance':{'type':'rgb','value':[11,10.5,9.3]}}}
scene['rim']={'type':'rectangle','to_world':T.look_at(origin=[W*U+4,-3,8],target=[W*U/2,H*U/2,0],up=[0,1,0])@T.scale([3,2,1]),'emitter':{'type':'area','radiance':{'type':'rgb','value':[1.7,1.5,1.2]}}}
print('Render',profile,width,height_px,'preview' if preview else 'native master',flush=True)
img=mi.render(mi.load_dict(scene),seed=21,spp=24 if preview else 48)
output=R/(profile+('-preview' if preview else '-native8')+'.png')
mi.Bitmap(img).convert(mi.Bitmap.PixelFormat.RGBA,mi.Struct.Type.UInt8,True).write(str(output))
(R/(profile+'-registration.json')).write_text(json.dumps({'width':width,'height':height_px,'nativeBay':g['bay'],'nativeCanvasHeight':H,'body':{'x':left,'y':top,'width':bw,'height':bh},'holes':[{**t,'y':t['y']+3} for t in g['holes']],'pixelScale':width/W,'method':'Physical geometry, unique enamel microrelief, printed ink material and actual slotted brass screw meshes. No input photograph resampling.'},indent=2))
print(output,flush=True)
