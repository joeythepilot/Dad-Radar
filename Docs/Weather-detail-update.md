# Regional radar detail

Previously every zoom level stretched one 1080 by 560 NOAA image covering
80 degrees of longitude and 57 degrees of latitude. Close views therefore
magnified a small number of weather pixels.

The map now requests a 1600 by 1000 image for the visible geographic region,
with a margin around it. It rounds geographic bounds outward to whole degrees
so small movements and nearby views reuse cached images. The resulting image
uses the exact same coordinate projection as the map and aircraft.

New frames preload before their image and geographic bounds are swapped
together. Failed requests retain the previous aligned frame; a frame not
successfully refreshed for ten minutes is hidden. Region changes are limited
to one attempt per 30 seconds, and the existing five-minute radar cycle remains.

The home server shares concurrent identical requests, caches images for five
minutes, limits its image cache to 16 regions, and times out upstream requests
after 12 seconds. Different display extents may need different regional images;
they still use the home server's shared weather cache. Aircraft polling remains
owned solely by the server-master controller.

Verification: NOAA's current endpoint returned a 1600 by 1000 PNG for a regional
request. Tests cover geographic alignment, viewport detail, stable rounded
regions, concurrent fetch sharing, failure recovery and bounded cache size.
Chromium also loaded the regional NOAA image in the ORD–ABE compact display;
the SVG image bounds and requested geographic bounds matched.
This improves sampling of the source radar; it does not create detail beyond
NOAA's underlying radar product resolution.

Install cumulatively using `Docs/Server-master-update.md`, then reopen the
displays. There are no new credentials, subscriptions or family-link settings.
