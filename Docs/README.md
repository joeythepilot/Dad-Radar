# DadRadar documentation

Start with the current build, not an old implementation note.

| Need | Read |
| --- | --- |
| Current branch, architecture, deployment and guardrails | [Current build handoff](Current-build-handoff.md) |
| Source folders and entry points | [Application structure](Application-structure.md) |
| Server and client responsibilities | [Software architecture](Software-architecture.md) and [Data flow](Dataflow.md) |
| Working display and family access | [Family beta guide](Family-beta-guide.md) and [Mobile family setup](Mobile-family-setup.md) |
| Remote operations | [Home-control guide](../ops/home-control/README.md) |
| Approved hardware | [Artwork implementation](Approved-map-artwork-implementation.md), [wheel readouts](Instrument-wheel-readouts.md), [console layout](UI/Console-layout.md) |
| Display updates | [Automatic refresh](Display-update-refresh.md) |
| Cleanup scope and evidence | [Repository audit](Repository-audit-2026-09-19.md) and [cleanup result](Repository-cleanup-2026-09-19.md) |
| Product intent | [Product vision](Product-vision.md) and [Design canon](Design-canon.md) |
| Historical decisions and future ideas | [Project decisions](Project-decisions.md), [roadmap](Roadmap.md), [feature backlog](Feature-backlog.md) |

The active branch is `agent/mobile-companion`; inspect its latest code before editing. `main` is a retained older release, not the current family-beta build. Dated repair notes and plans describe their original checkpoints and may contain superseded designs. Git history preserves retired experiments.

Use `Docs/` consistently, including [implementation plans](superpowers/plans/) and [specifications](superpowers/specs/). Update current references when behavior changes. Do not turn historical prose into a new implementation requirement.
