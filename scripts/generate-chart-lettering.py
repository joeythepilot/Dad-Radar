"""Build IM FELL English outlines and WOFF subsets from original font sources.
Usage: python scripts/generate-chart-lettering.py /path/to/imfellenglish
Source: https://github.com/google/fonts/tree/main/ofl/imfellenglish
Required files: IMFeENrm28P.ttf, IMFeENit28P.ttf, OFL.txt
"""
from pathlib import Path
import json, subprocess, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools import subset
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1])
labels=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./data/map-labels")))'],cwd=root))
chars=set(chr(i) for i in range(32,127))
for l in labels:chars.update(l['text']+l['text'].lower())
data={};missing=[]
for face,name in [('roman','IMFeENrm28P.ttf'),('italic','IMFeENit28P.ttf')]:
 font=TTFont(source/name);cmap=font.getBestCmap();gs=font.getGlyphSet();scale=1000/font['head'].unitsPerEm;glyphs={}
 for char in sorted(chars):
  glyph=cmap.get(ord(char))
  if not glyph:
   missing.append(char);continue
  pen=SVGPathPen(gs,ntos=lambda n:format(n,'.2f').rstrip('0').rstrip('.') if '.' in format(n,'.2f') else format(n,'.2f'))
  gs[glyph].draw(TransformPen(pen,(scale,0,0,-scale,0,0)))
  glyphs[char]={'advance':round(font['hmtx'][glyph][0]*scale,3),'path':pen.getCommands()}
 kern={}
 if 'kern' in font:
  names={cmap.get(ord(c)):c for c in chars}
  for table in font['kern'].kernTables:
   for (a,b),v in table.kernTable.items():
    if a in names and b in names:kern[names[a]+names[b]]=round(v*scale,3)
 data[face]={'glyphs':glyphs,'kern':kern}
 opts=subset.Options();opts.flavor='woff';s=subset.Subsetter(options=opts);s.populate(unicodes=[ord(c) for c in chars]);s.subset(font);font.flavor='woff';font.save(root/'assets/maps'/('chart-antique-'+face+'.woff'))
(root/'App/chart-glyphs.js').write_text('/* IM FELL English outlines, Copyright 2010 Igino Marini; SIL OFL 1.1. See assets/maps/FONT-LICENSE.txt. */\n(function(root,data){if(typeof module==="object"&&module.exports)module.exports=data;else root.dadRadarChartGlyphs=data;})(typeof globalThis!=="undefined"?globalThis:this,'+json.dumps(data,separators=(',',':'),ensure_ascii=True)+');\n')
(root/'assets/maps/FONT-LICENSE.txt').write_text('\n'.join(line.rstrip() for line in (source/'OFL.txt').read_text().splitlines())+'\n')
print('Missing characters:', sorted(set(missing)))
print('Outline bytes:',(root/'App/chart-glyphs.js').stat().st_size)
