# Walnut frame placement implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan inline.

**Goal:** Install the rendered wooden frames above the existing mobile content, with complete approved metal assemblies on top.

**Architecture:** One static transparent PNG per orientation. Fit each complete panel uniformly so the photograph and its live openings stay registered at every screen size.

**Tech Stack:** Existing browser JavaScript/CSS and PNG images; no runtime modeling or new dependencies.

**Spec:** Joey's October15 instruction: wooden frames over existing modules, metal plates over wood; preserve approved instruments and working mechanisms.

## Global Constraints
- Preserve exact approved metal PNGs and all live mechanisms.
- No runtime wood generation, texture stretching or CSS decorative frames.
- Keep current portrait390x1000 and landscape1024x576 reference arrangements.
- No changes to primary physical dashboard, data, controls or duty-card behavior.

## Review Focus
- Phone/tablet opening registration after scaling.
- Complete instrument plates above wood, no circular clipping.
- Portrait scrolling and orientation changes.
- Existing photographic clock/flap cutouts remain registered after uniform scaling.
- PNG decode and pointer events.

### Task 1: Install and verify frame artwork

**Files:** Mobile/layout.js, Mobile/layout.css, Mobile/photo-registration.js; two new PNG assets; existing mobile browser/layout checks.
**Interfaces:** Existing dashboard/metal module selectors; --family-panel-scale provides the uniform scale for the existing photo registration.

- [x] Add a browser assertion for wood above content and metal above wood; observe failure against the rear underlay.
- [x] Install the two rendered PNGs and their placement styles.
- [x] Fit the two reference panels uniformly; normalize existing metal canvas registration to panel coordinates.
- [x] Verify full aperture-edge alpha and exact normalized live geometry at phone, tablet and portrait sizes; inspect screenshots.
- [x] Run existing relevant browser checks and npm test once; review changed source before reporting completion.

Ruling: Joey has explicitly authorized execution and repeatedly instructed no unnecessary approval stops. Continue inline without another plan approval.

Review: one Important finding (viewport-derived spacing) fixed by retaining native7px outer padding and6px panel gap within family scope. Wide1920 case now passes. No other Important/Critical findings.
