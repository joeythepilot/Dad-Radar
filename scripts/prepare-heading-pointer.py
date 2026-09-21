"""Extract Joey's approved pointer; requires Pillow, numpy and scipy.

Usage: python scripts/prepare-heading-pointer.py APPROVED_SOURCE.png
The source has a baked checkerboard, removed using its closed dark outline.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(__file__).resolve().parents[1]
folder = root / 'assets/instruments/heading'
source = Image.open(sys.argv[1]).convert('RGB')
assert source.size == (1254, 1254)
rgb = np.asarray(source)
labels, _ = ndimage.label(ndimage.binary_fill_holes(rgb.max(axis=2) < 120))
sizes = np.bincount(labels.ravel())
sizes[0] = 0
mask = labels == sizes.argmax()
assert 280000 < mask.sum() < 290000
pointer = source.convert('RGBA')
pointer.putalpha(Image.fromarray((mask * 255).astype('uint8')))
box = pointer.getbbox()
assert box == (229, 122, 1026, 1131)
scale = 310 / (box[2] - box[0])
pointer = pointer.crop(box).convert('RGBa').resize(
    (310, round((box[3] - box[1]) * scale)), Image.Resampling.LANCZOS
).convert('RGBA')
position = (round(512 - (626 - box[0]) * scale),
            round(505 - (611 - box[1]) * scale))
original = Image.open(folder / 'heading-airplane-glass-overlay.png').convert('RGBA')
output = original.copy()
output.paste((0, 0, 0, 0), (345, 305, 680, 726))
output.alpha_composite(pointer, position)
before, after = np.asarray(original), np.asarray(output)
outside = np.ones((1024, 1024), dtype=bool)
outside[305:726, 345:680] = False
assert np.array_equal(before[outside], after[outside])
y, x = np.ogrid[:1024, :1024]
assert not after[:, :, 3][(x - 512)**2 + (y - 512)**2 > 440**2].any()
output.save(folder / 'heading-airplane-glass-overlay-v2.png', optimize=True)
print('Saved registered 1024x1024 RGBA overlay; original glass and index preserved.')
