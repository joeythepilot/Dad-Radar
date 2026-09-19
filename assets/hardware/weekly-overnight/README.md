# DadRadar weekly overnight module

This folder contains the reusable physical artwork for the seven-bay weekly overnight display that replaces the paper ticker.

Production asset:
- `weekly-overnight-module.png`
- source resolution: 1192 x 976 px (8x the 149 x 122 logical design coordinates)
- display size remains controlled by the existing seven equal bays, not source pixels
- transparent PNG
- reused seven times side-by-side
- day label and four overnight characters remain live/dynamic and are not baked into the artwork

Do not resize, crop, pad, or distort the production asset in source control. Layout code should place seven equal 1fr bays across the existing ticker opening.

## Original artwork provenance

Restored byte-for-byte from `dadradar_weekly_module_dark_HQ_1192x976.png` on 2026-09-19.
SHA-256: `ac97916a25af2ed2a5780e4a63857f53527738ae997e8b09667f9101f35e681e`.
The previous 149 x 122 production PNG matched the saved `dadradar_weekly_module_dark_FINAL_149x122.png`
(SHA-256 `af819c9593a86787f9c58eb27fe416f7d6522546aebe2f4706f198edd96940b4`).
That reduced copy remains recoverable in Git history. Do not substitute it for the high-resolution source.
This asset-only replacement preserves the existing live canvas coordinates, weekday font size, animation, and layout.

## Live text resolution

The text overlay uses the same 149 x 122 logical coordinates and 24 px weekday font.
Its backing bitmap follows the displayed bay size and device pixel ratio, with a
minimum 2x rendering density for smooth letter edges. A context transform keeps
weekday labels, wheel characters, clipping, and animations in their original positions.
Layout changes and window resizes redraw settled text without restarting wheel motion.
