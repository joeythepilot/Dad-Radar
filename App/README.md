# Display application

`main.js` renders the primary cabinet from shared server state. Other modules own presentation, map transport, sound and artwork overlays. `boot-diagnostic.js` and `deployment-refresh.js` load independently of the generated application bundle so startup failures and deployments can still be handled.

The build source list lives in `../scripts/build-browser.js`. Edit those source files rather than generated bundles. `weekly-ticker.js` retains its established public name but now contains only the active seven-module overnight display and its shared helpers.

See [application structure](../Docs/Application-structure.md) and the [current handoff](../Docs/Current-build-handoff.md) before changing behavior.
