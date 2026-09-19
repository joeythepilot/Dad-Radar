# Shared services

This directory contains the Calendar/live reconciliation controller, browser API adapters, refresh scheduling and the mock display fixture. External provider implementations live in `../server/`.

`calendar-state-controller.js` has two active roles: browser clients consume `/api/state`, while the master server runs reconciliation in a VM context with injected storage/provider adapters. Do not remove the reconciliation side as apparently unused browser code. The server owns upstream acquisition and publishes the result to all displays.

See [software architecture](../Docs/Software-architecture.md).
