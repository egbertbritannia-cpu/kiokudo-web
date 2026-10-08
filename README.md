# Kiokudo Web

Frontend for Kiokudo — Next.js / React / TypeScript.

> **Migration status: bootstrap in progress.** The existing production application remains in [`japanese-srs-system`](https://github.com/egbertbritannia-cpu/japanese-srs-system). Do not switch production to this repository until the API migration and end-to-end checks pass.

This repository will hold the user interface, static UI concepts, Dexie offline queue and a thin same-origin BFF. It must never ship Turso or provider secrets to the browser.
