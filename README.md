# Voyage

**Trapnest Voyage** is an illustrated WebGL experience and [Trapnest](https://henrywithu.com/) sub-project, a sun-drenched sister of [Trapnest Spirit](https://spirit.henrywithu.com/). It keeps Spirit's engine, scroll structure, manga line-art rendering and motion, and tells a new story: Chaewon follows a melody along a golden shore to a stone gate, chooses one of three Trapnest Voyage elixirs in a golden hall, and is lifted into the light. The palette is sunflower yellow in place of Spirit's red. The application runs as modular React and Three.js code under Vite.

```sh
npm install
npm run dev
```

Cloudflare Workers preparation uses Workers Static Assets with SPA fallback:

```sh
npm run cf:dev
npm run deploy
```

The configured Worker name is `trapnest-voyage`. Attach `voyage.henrywithu.com` as its custom domain in Cloudflare after the first authorized deployment; no DNS or account state is changed by this repository.

Open the local URL printed by Vite and answer the L.A.S.T. gate. Scroll through the story, hold the portal/pouring/antigravity controls, choose a tide (Lagoon, Jade or Coral), and use the Collection button to reach the flask carousel. The audio button mutes or unmutes the experience.

```sh
npm run check:assets
npm run check:brand
npm run check:render
npm run build
npm run preview
```

The production build is written to `dist/`. HMR preserves the current reading position, selected tide and consent during development. A fresh page starts at the age gate.

## What is new in Voyage

| Part | Where | How it is made |
| --- | --- | --- |
| Story, heroine, environments, key item | [docs/STORY.md](docs/STORY.md) | Story bible |
| Chaewon (every rig, pose and close-up) | `scripts/character/` | CC0 MakeHuman base shaped to her proportions, procedural lace sundress and hair, fitted to each of Spirit's rigs; SVG-drawn face and eye art |
| Trapnest Voyage elixir flask | `scripts/item/` | Surface-of-revolution glass, brass collar and compass-rose medallion; SVG label, brass and enamel textures; line-art and PBR variants |
| Narration | `scripts/narration/` | Kokoro TTS (`af_heart`) with word timings for the karaoke text boxes |
| Soundtrack | `scripts/music/` | Five drones, a bossa loop and a shore ambience rendered from the GeneralUser GS SoundFont with numpy synthesis and convolution reverb |
| Yellow palette | `src/data/theme.ts`, `scripts/theme/` | Spirit's reds remapped to sunflower yellow; tide colours in one place |
| Display lettering | `scripts/lettering/` | Charles Rosie glyph quads and distance fields for "Sail away, stay golden", the collection verse and the tide titles |
| Logos, loader emblem, social card | `scripts/brand/` | Compass-rose wordmarks, a Chaewon emblem in the loader animation, and an engine render on an ink-splatter card |

Every generator is deterministic and writes straight into `public/assets`. Their inputs that are not in this repository (MakeHuman data, Kokoro models, the SoundFont, Chromium for SVG rasterisation) are named in each script's docstring.

## Credits

- Engine and scroll experience: [Trapnest Spirit](https://spirit.henrywithu.com/), a source-derived reconstruction of [Santioni Spirits](https://santionispirits.com/).
- Character base mesh: [MakeHuman](http://www.makehumancommunity.org/) (CC0 assets).
- Narration voice: [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache 2.0).
- Instruments: [GeneralUser GS](https://www.schristiancollins.com/generaluser) by S. Christian Collins, whose license permits use in music production.

## Documents

- [Story bible](docs/STORY.md)
- [Reverse engineering, architecture and source inventory](docs/REVERSE_ENGINEERING.md) (inherited from Spirit)
- [Validation coverage](docs/COVERAGE.md) (inherited from Spirit)
- [Asset provenance and checksums](reference/asset-provenance.json), with [Voyage replacements](reference/voyage-assets.json)

No production deployment has been performed.
