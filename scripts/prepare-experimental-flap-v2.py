"""Build independently compositable hardware/card layers at native tile aspect.
Generated unlit-master supplies fixed frame pixels. Nine-slice frame reconstruction
preserves corner/hinge proportions; uninterrupted opaque material supplies cards.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib
root=Path(__file__).resolve().parent.parent/'assets/split-flap/experimental-v2'
im=Image.open(root/'unlit-master.png').convert('RGBA');assert im.size==(1039,1514)
w,h=826,1514;edge=130;joint=h//2
# Shorten the straight housing rails; preserve both side frames/corners at1:1.
# No global horizontal compression of hinges or corners.
frame=Image.new('RGBA',(w,h))
frame.paste(im.crop((0,0,edge,h)),(0,0))
frame.paste(im.crop((edge,0,1039-edge,h)).resize((w-2*edge,h),Image.Resampling.LANCZOS),(edge,0))
frame.paste(im.crop((1039-edge,0,1039,h)),(w-edge,0))
# Relocate each complete hinge assembly so the original joint862 maps to757,
# preserving its dimensions. Fill its former location with clean straight rail.
for x0,x1 in [(0,edge),(w-edge,w)]:
 band=frame.crop((x0,600,x1,1000));clean=frame.crop((x0,1000,x1,1105))
 frame.paste(band,(x0,495));frame.paste(clean,(x0,895))
mask=Image.new('L',(w,h),255);d=ImageDraw.Draw(mask)
d.rectangle((126,299,w-110,1439),fill=0)
# Independent opaque mechanical joint; no seam is present on moving cards.
d.rectangle((126,joint-3,w-110,joint+3),fill=255)
seam=im.crop((126,859,930,866)).resize((w-110-126+1,7),Image.Resampling.LANCZOS)
frame.paste(seam,(126,joint-3))
from PIL import ImageChops
frame.putalpha(ImageChops.multiply(frame.getchannel('A'),mask))
frame.save(root/'experimental-fixed.png')
# Crop only material pixels. The material has no housing, hinge, edge, lamp or seam.
texture=Image.open(root/'card-material-source.png').convert('RGBA');assert texture.size==(1039,1514)
surface=texture.crop(((1039-w)//2,0,(1039-w)//2+w,h));assert surface.getchannel('A').getextrema()==(255,255)
surface.save(root/'experimental-surface.png')
surface.crop((0,0,w,joint)).save(root/'upper-flap.png');surface.crop((0,joint,w,h)).save(root/'lower-flap.png')
(root/'layer-contract.json').write_text(json.dumps({'canvas':[w,h],'source_canvas':[1039,1514],'source_seam':862,'registered_seam':joint,'pivot':0.5,'fixed_opening':[126,299,w-109,1440],'surface_alpha_range':[255,255],'native_tile':[70.28125,128.875],'aspect_error_fraction':abs((w/h)/(70.28125/128.875)-1),'registration':'Nine-slice straight rails; side frames and hinges1:1; complete hinge assemblies shifted-105px; seam relocated independently','moving_source':'Opaque hardware-free continuous generated material; no frame, hinge, seam or lamp pixels','fixed_source':'Generated unlit-master, clean aperture mask; hardware stationary','lighting':'Separate warm-lighting.svg/RGBA PNG controls ::after; original blank opacity/fade retained','upper_lower':'One continuous material split at757; CSS full material100%x200% is authoritative','hashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in root.glob('*.png')}},indent=2))
