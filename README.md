# Spirit

**Trapnest Spirit** is an illustrated WebGL experience and [Trapnest](https://henrywithu.com/) sub-project, built as a source-derived TypeScript reconstruction of [Santioni Spirits](https://santionispirits.com/). Original geometry, textures, fonts, narration, audio and shaders are retained as evidence; public-facing identity and selected bottle artwork are original Trapnest adaptations. The application runs as modular React and Three.js code under Vite.

```sh
npm install
npm run dev
```

Cloudflare Workers preparation uses Workers Static Assets with SPA fallback:

```sh
npm run cf:dev
npm run deploy
```

The configured Worker name is `trapnest-spirit`. Attach `spirit.henrywithu.com` as its custom domain in Cloudflare after the first authorized deployment; no DNS or account state is changed by this repository.

Open the local URL printed by Vite and answer the L.A.S.T. gate. Scroll through the story, hold the portal/pouring/antigravity controls, select a flavor, and use the Collection button to reach the bottle carousel. The audio button mutes or unmutes the experience.

```sh
npm run check:assets
npm run check:brand
npm run check:render
npm run build
npm run preview
```

The production build is written to `dist/`. HMR preserves the current reading position, selected story flavor and consent during development. A fresh page starts at the age gate.

- [Reverse engineering, architecture and source inventory](docs/REVERSE_ENGINEERING.md)
- [Validation coverage and remaining fidelity work](docs/COVERAGE.md)
- [Asset provenance and checksums](reference/asset-provenance.json)

The reconstructed implementation and Trapnest adaptation are complete in the repository. The coverage document separates implemented behavior from directly verified visual and behavioral parity; remaining entries are optional device/frame-synchronization comparisons, not missing routes. No production deployment has been performed.
