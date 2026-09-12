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
wasm-pack build --target web --out-dir ../../public/wasm --out-name pendant --release
rm -f ../../public/wasm/.gitignore
```

This generates `pendant.js` and `pendant_bg.wasm` in `public/wasm`, which are loaded dynamically by `PendantCanvas` (`src/features/pendant-viewer/components/PendantCanvas.tsx`) via `import('../../../../public/wasm/pendant.js')`.

**The `rm -f` step matters.** `wasm-pack` always writes a `.gitignore` containing
`*` into `--out-dir`, since it assumes that dir is a disposable `pkg/` folder.
Here the out-dir is inside `public/`, so that auto-generated file silently
untracks the very files the web app needs at runtime — Vercel (or any fresh
`git clone`) then fails with `Module not found: '.../public/wasm/pendant.js'`
because the wasm output never made it into the repo. Delete it every time you
rebuild, then commit the regenerated `pendant.js` / `pendant_bg.wasm` — Vercel
does not run this Rust build step itself, it just serves the checked-in files.

## Development

- Entry point: `src/lib.rs` — sets up the Bevy `App`, renders onto the `#pendant-canvas` canvas element, and rotates the mesh on left-click drag.
- Re-run the build command above after any change to regenerate the wasm bundle consumed by the web app, then commit the updated `public/wasm/pendant.js` and `public/wasm/pendant_bg.wasm`.
- `pendant_bg.wasm` currently ships at ~49MB because `bevy` is pulled in with
  its default features (full renderer, audio, glTF, UI, text, gizmos, image
  codecs...) even though this crate only uses procedural meshes, a
  `StandardMaterial`, and a `DirectionalLight`. Trimming `Cargo.toml` to
  `bevy = { version = "0.19.0", default-features = false, features = [...] }`
  with only the needed subsystems would cut this dramatically — worth doing
  before shipping this to real users, tracked as follow-up.
