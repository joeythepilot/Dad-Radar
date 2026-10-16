# Companion first-load delivery

Joey authorized finishing the 35-second loading problem, including deployment. The earlier cache/startup release is already running. This follow-up changes how built-in files reach the authenticated companion; primary images, source artwork, dimensions, mechanisms and layout stay unchanged.

## Chosen tradeoff

Build native-dimension WebP copies at quality96 with alphaQuality100; gzip built-in JavaScript, CSS and SVG. RGB compression is intentionally lossy. The build independently decodes each copy and uses lossless encoding instead whenever the native detail budget or exact alpha test fails. Do not describe the high-quality copies as identical pixels or as the old lossless study passing. Original PNGs remain intact and are served when WebP is declined or a generated file is missing. The failed study and its exact-pixel assertion remain separate and held back. This is a new, explicitly high-quality delivery strategy with its own measured error bounds and timing proof.

Sharp is pinned as a build-only development dependency. Normal Windows host/autostart builds, npm build, tests and deployment all use the common scripts/build-browser.js entry point. Generated encodings live in ignored runtime/companion-assets. Serving uses only prebuilt static files; no image processing or new renderer runs on requests. Generated filenames include the source content and encoding-profile hash. No originals or binary assets are uploaded through chat.

The middleware runs after existing gateway authentication and authorization. Only manifest-listed built-in files can be served. Vary separates Accept/Accept-Encoding variants; conditional ETags are variant-specific. Ranges use the original static server. Existing private revalidation applies only to artwork; code/config, HTML, authentication, live/calendar/API data, errors and unauthorized responses remain no-store. The primary application does not use this middleware.

## Acceptance evidence

- Full npm test, including actual HTTP negotiation, q=0 fallback, ranges,304, original/variant separation, gzip bytes and missing-encoding fallback.
- Verify every encoded source SHA; retain full native dimensions and exact alpha at every source pixel for all hardware. Native opaque RGB mean error <3/255 and RMS error <6/255.
- Actual authenticated gateway Chromium/WebKit cold/repeat/original-fallback comparison; >=65% fewer cold artwork/audio bytes and <15MB, with >=90% fewer repeat bytes.
- Chromium simulates the same10Mbps/80ms link for both fresh contexts. Require >=45% improvement in load event AND complete visual readiness. This is controlled browser evidence, not Joey's actual5G measurement.
- Compare ten approved images in each browser at display resolution, bound mean/RMS error, verify original PNG fallback byte hashes, exercise rotation, hardware geometry and existing eight family layouts. No claim of Joey's physical-device visual approval.

The existing AZO poster source is truncated and cannot be decoded by either Sharp or Pillow. It is deliberately left untouched, omitted from optimization, and retains the original poster loader/fallback. This is a pre-existing source defect, not a successful encoding or repaired poster.

Release only after the full exact-SHA gate and Windows contract succeed. Use the existing private allowlisted deploy followed by a separate empty status request, verify installed/running SHA, healthy clean checkout, changed instance and unchanged executor. Then publish a metadata-only baseline receipt and continuity checkpoint.
