# Split-flap balance and bottom-frame preview — 2026-10-09 EDT

Preview revision only. Not visually approved, published to GitHub, merged or deployed. MAXWELLHOUSE remains independently verified healthy on40659507fb9cecb6924152ad0cf89e01f470ed6b. Metadata-only source baseline1f6ca8f8dd04bcefe80de17c6d4df9d909d52c8b records that deployment. Isolated local branch experiment/flap-balance-2026-10-08.

Joey reported excessive bottom negative space and a clipped/missing lower housing edge, requested moving the split/hinges and text lower, and emphasized preserving the photographic charcoal flap texture.

The generated fixed housing now has a complete bottom rail/corners inside its926×1698 canvas. The meaningful opaque frame ends at row1682, leaving15 source pixels below it. The transparent apertures reveal the existing live cards. Measured seam/hinge axis row948 registers to55.8303887% of the tile: about7.51 display pixels lower on the native128.875-pixel tile.

The live upper/lower half bounds, their full-card background mapping and both printed-ink centers share that measured axis. Native transforms,190ms duration,185ms lower delay and flight-number logic remain unchanged. The original approved V2 opaque card material, photographic texture and separate V3 rectangular lamp are reused unchanged. Lamp off/blank behavior remains. No housing, hinges, lamps or text are baked into moving card surfaces.

All18 primary tiles use the candidate frame. Every outer module/tile rectangle in the46-element baseline is unchanged, including spacing and all other modules. Mobile retains its original artwork and layout.

Verification: full npm test passed; focused all18-tile browser proof passed joint/ink registration, stationary hardware, material, native indexing, settle/restoration, blank off and original mobile; headed Chromium split-flap proof passed; git diff --check passed. Independent review found no important blockers for this preview. Candidate WebKit/hosted release/home deployment have not been run or claimed.

Capture: actual dashboard fixture at1920×1080,DPR1,Chromium153.0.8010.0/Playwright1.63.0,fictional EN ROUTE ORD–AVL3761,fixed time2026-10-09T02:35:00Z,America/New_York. Comparison enlarges actual native-size crops4×. Indexing animations paused at100ms. No physical monitor verification claimed.

Fixed-frame artwork was edited with built-in ImageGen using the previous fixed housing as the edit target; moving texture and lighting were not regenerated. The exact asset, layer contract, consuming CSS, focused test, captures and results are packaged for review. The raw generated edit is also retained by the image-generation tool.
