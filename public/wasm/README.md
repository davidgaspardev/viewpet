# Pendant 3D

Rust + [Bevy](https://bevyengine.org/) crate that renders the pet pendant in 3D, compiled to WebAssembly and embedded in the View Pet web app (`PendantCanvas`).

## Prerequisites

- Rust (stable) via [rustup](https://rustup.rs)
- `wasm32-unknown-unknown` target:
  ```bash
  rustup target add wasm32-unknown-unknown
  ```
- [`wasm-pack`](https://rustwasm.github.io/wasm-pack):
  ```bash
  brew install wasm-pack
  # or: cargo install wasm-pack
  ```

## Build

From this directory, build the wasm bundle and emit it straight into the web app's public assets:

```bash
wasm-pack build --target web --out-dir ../../public/wasm --out-name pendant
```

This generates `pendant.js` and `pendant_bg.wasm` in `native/public/wasm`, which are loaded dynamically by `PendantCanvas` (`src/features/pendant-viewer/components/PendantCanvas.tsx`) via `import('../../../../public/wasm/pendant.js')`.

## Development

- Entry point: `src/lib.rs` — sets up the Bevy `App`, renders onto the `#pendant-canvas` canvas element, and rotates the mesh on left-click drag.
- Re-run the build command above after any change to regenerate the wasm bundle consumed by the web app.
