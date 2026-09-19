# DadRadar weekly overnight module

This folder contains the reusable physical artwork for the seven-bay weekly overnight display that replaces the paper ticker.

Production asset:
- `weekly-overnight-module.png`
- visible hardware bounds: 149 x 122 px at the 1920 x 1080 DadRadar layout
- transparent PNG
- reused seven times side-by-side
- day label and four overnight characters remain live/dynamic and are not baked into the artwork

Do not resize, crop, pad, or distort the production asset in source control. Layout code should place seven equal 1fr bays across the existing ticker opening.
