# Automatic refresh after deployments

Open displays check `/api/health` every ten seconds and immediately on pageshow, focus, becoming visible, or reconnecting. Each served page carries its server instance and deployment SHA. A mismatch replaces the current URL with a cache-busting deployment parameter while retaining the path, layout choices, and fragment. Display HTML is served with `private, no-store`.

The watchdog loads independently from the UI bundle on the main, full-family, and compact pages. Failed, unauthenticated, or timed-out checks keep the current display intact. Requests cannot overlap; polling recovers after stalled connections. A loaded page requests at most one reload.

Investigation reproduced two gaps: the old watcher accepted its first health response as its baseline even when the page was stale, and the protected family gateway returned 404 for its health requests. The signed-in gateway now returns only `ok`, `version`, and `instanceId` for GET/HEAD health checks. Provider diagnostics remain unavailable through that gateway. The exact home-screen URL at the time of the reported failure was not available, so neither cause is asserted as the sole cause of that incident.

Verification covers stale initial pages, version/instance changes, outages, stalled/overlapping requests, protected health access and authentication, HTML markers/cache headers, and real-browser automatic navigation after a simulated deployment. Browser checks preserve query/fragment/layout, recover after downtime, reload even with an unrelated UI exception, and avoid reload loops. Existing artwork/layout tests cover five viewport sizes.

Rollout: old full-family pages previously denied health access need one successful poll to establish their old-style baseline. A subsequent controlled restart lets those already-open pages detect the change and load this watchdog. Sleeping/offline displays check when they resume; an old page without any functioning watcher still needs a one-time manual refresh. No server can execute new JavaScript in a disconnected or non-running page.
