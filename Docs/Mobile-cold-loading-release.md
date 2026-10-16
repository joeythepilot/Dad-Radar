# Companion first-load delivery

Joey authorized finishing the 35-second loading problem, including deployment. The earlier cache/startup release is already running. This follow-up changes how built-in files reach the authenticated companion; primary images, source artwork, dimensions, mechanisms and layout stay unchanged.

## Chosen tradeoff

Keep the landscape native8 housing PNG, losslessly recompressed with all original metadata; encode portrait native8 losslessly as WebP. Other images use full native-dimension WebP quality96/alphaQuality100, with automatic lossless fallback when independently decoded exact alpha or native opaque detail budgets fail. Those high-quality copies are intentionally lossy in RGB; do not call them pixel-identical or call the old lossless study passing. Brotli/gzip compress built-in JS/CSS/SVG without changing decompressed bytes. Original source files stay intact, primary serving stays original, and missing/declined encodings fall back. The complete original representation can also be requested after authentication with X-DadRadar-Original:1.

Sharp is pinned as a build-only development dependency. Normal Windows host/autostart builds, npm build, tests and deployment all use the common scripts/build-browser.js entry point. Generated encodings live in ignored runtime/companion-assets. Serving uses only prebuilt static files; no image processing or new renderer runs on requests. Generated filenames include the source content and encoding-profile hash. No originals or binary assets are uploaded through chat.

The middleware runs after existing gateway authentication and authorization. Only manifest-listed built-in files can be served. Vary separates Accept/Accept-Encoding variants; conditional ETags are variant-specific. Ranges use the original static server. Existing private revalidation applies only to artwork; code/config, HTML, authentication, live/calendar/API data, errors and unauthorized responses remain no-store. The primary application does not use this middleware.

## Acceptance evidence

Corrected candidate89310d6f8bfebb2c1b9a0120ea3b5127a33f818e was also rejected. Its lossless landscape WebP still differed in WebKit's scaled canvas (mean2.817/RMS7.515), while portrait was0/0 and all other nine comparisons were within bounds. Raw native RGBA was exact, so do not claim the browser difference is understood or harmless. The landscape now stays PNG: lossless IDAT recompression, identical IHDR/RGBA and ALL original ancillary/color metadata. Portrait remains lossless WebP. Prebuilt Brotli quality6 improves the large vector maps/code without changing a byte after decompression; gzip remains fallback. Full PNG originals are available with authenticated X-DadRadar-Original:1; Vary separates that representation. Browser proof explicitly offers br/gzip as current HTTPS companion clients do, while original baseline uses identity. Native/display quality and timing/byte budgets are unchanged.

The89310 gate also found sequence-text containment measured by the screenshot wrapper before screenshot's own font/style settling. Await all linked styles, fonts and two animation frames before the same strict fit checks; report measured widths/font on any failure. No font, layout, mechanism or source image change. The previous WebKit map access-control failure did not recur; its diagnostics/zero-error requirement remain.

First hosted candidate0c59ff9d3fd0fd73ae402337c403a6c13ebb5582 passed Chromium timing/quality and all eight family layouts, but WebKit exceeded the display-error budget for the native8 landscape plate. It was not deployed. Independent offline comparison measured only0.227 mean/0.574RMS display error, so offline/source equality is insufficient. Use lossless encoding for BOTH native8 plates; preserve the same browser limits and log all ten comparisons before assertions. Do not claim a specific WebKit decoder cause without evidence. First Chromium controlled10Mbps/80ms result:44,919,529 to11,810,708 artwork/audio bytes; full readiness39.081 to10.788seconds. Those are rejected-candidate Chromium measurements, not final release or actual5G results.

- Full npm test, including actual HTTP negotiation, q=0 fallback, ranges,304, original/variant separation, gzip bytes and missing-encoding fallback.
- Verify every encoded source SHA; retain full native dimensions and exact alpha at every source pixel for all hardware. Native opaque RGB mean error <3/255 and RMS error <6/255.
- Actual authenticated gateway Chromium/WebKit cold/repeat/original-fallback comparison; >=65% fewer cold artwork/audio bytes and <15MB, with >=90% fewer repeat bytes.
- Chromium simulates the same10Mbps/80ms link for both fresh contexts. Require >=45% improvement in load event AND complete visual readiness. This is controlled browser evidence, not Joey's actual5G measurement.
- Compare ten approved images in each browser at display resolution, bound mean/RMS error, verify original PNG fallback byte hashes, exercise rotation, hardware geometry and existing eight family layouts. No claim of Joey's physical-device visual approval.

The existing AZO poster source is truncated and cannot be decoded by either Sharp or Pillow. It is deliberately left untouched, omitted from optimization, and retains the original poster loader/fallback. This is a pre-existing source defect, not a successful encoding or repaired poster.

Release only after the full exact-SHA gate and Windows contract succeed. Use the existing private allowlisted deploy followed by a separate empty status request, verify installed/running SHA, healthy clean checkout, changed instance and unchanged executor. Then publish a metadata-only baseline receipt and continuity checkpoint.
