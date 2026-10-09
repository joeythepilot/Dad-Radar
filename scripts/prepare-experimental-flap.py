"""Deterministic masks from the supplied flattened master; no painted/generated pixels.
The supplied separations duplicate hardware. Use master pixels once per layer.
Register source seam y=483 to unchanged browser joint 50%. No module geometry changes.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import argparse, hashlib, json
p=argparse.ArgumentParser();p.add_argument('source');args=p.parse_args()
source=Path(args.source);out=Path(__file__).resolve().parent.parent/'assets/split-flap/experimental-v1'
master=Image.open(source/'blank-tile-master.png').convert('RGBA')
def register(im):
 result=Image.new('RGBA',(607,884));result.paste(im.crop((0,0,607,483)).resize((607,442),Image.Resampling.LANCZOS),(0,0));result.paste(im.crop((0,483,607,884)).resize((607,442),Image.Resampling.LANCZOS),(0,442));return result
# Fixed hardware includes full housing, the seam and both complete hinge footprints.
mask=Image.new('L',master.size,255);d=ImageDraw.Draw(mask);d.rectangle((59,156,544,819),fill=0);d.rectangle((37,445,87,522),fill=255);d.rectangle((520,445,571,522),fill=255);d.rectangle((59,477,544,489),fill=255)
fixed=master.copy();from PIL import ImageChops
fixed.putalpha(ImageChops.multiply(master.getchannel('A'),mask))
# Keep card pixels from master, excluding hinge footprints. No separate light wash:
# illumination is already baked into the flattened photograph.
surface=master.copy();surface.putalpha(ImageChops.multiply(master.getchannel('A'),ImageChops.invert(mask)))
for name,im in [('experimental-fixed.png',fixed),('experimental-surface.png',surface)]:register(im).save(out/name)
audit=[]
for file in sorted(source.glob('*.png')):
 im=Image.open(file).convert('RGBA');a=im.getchannel('A');hist=a.histogram();audit.append({'file':file.name,'size':im.size,'alpha_range':a.getextrema(),'alpha_bounds':a.getbbox(),'alpha_zero_pixels':hist[0],'alpha_255_pixels':hist[255],'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
(out/'asset-audit.json').write_text(json.dumps({'source_assets':audit,'source_seam_y':483,'browser_joint_fraction':0.5,'registration':'piecewise vertical resample 0:483 to 0:442 and 483:884 to 442:884','limitations':['Flattened master alpha never reaches 255; extracted layers overlap and have partial opacity.','Upper and lower separations contain hinge fragments; unused as moving textures.','Small 49x129 preview has no fully transparent pixels and compresses the housing; not used.','Warm highlight is baked into master/housing; supplied light layer cannot remove it.','Mask is approximate: hardware rectangles omit card texture behind hinges.','Current tile aspect ratio compresses artwork horizontally by about 21% relative to source.']},indent=2))
