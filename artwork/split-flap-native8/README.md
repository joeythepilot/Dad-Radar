# Split-flap native metalwork

Offline asset authoring only. Runtime consumes two transparent PNGs, with original mechanisms untouched. Render with Python 3.12, Mitsuba 3.9.1 llvm_ad_rgb, numpy, scipy, shapely 2.1 constrained_delaunay_triangles, Pillow and DejaVu Sans Bold installed.

Run `python3 render_plate.py landscape` and `python3 render_plate.py portrait`. Deterministic seeds. Full physical geometry, unique wrinkle enamel heightfield and print albedo, slotted domed brass screw meshes, measured transparent apertures. No input photo stretching, repeated edge pixels or runtime material rendering. Native outputs 6578x893 / 2118x536, eight samples per original CSS pixel.

Approved geometry was measured from the existing mobile assembly; render registration JSON records exact body and cutout positions. Source clock and native flap geometry remain unchanged.
