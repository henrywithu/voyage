# Voyage

**Trapnest Voyage** is an illustrated WebGL experience and [Trapnest](https://henrywithu.com/) sub-project, a sun-drenched sister of [Trapnest Spirit](https://spirit.henrywithu.com/). It keeps Spirit's engine, scroll structure, manga line-art rendering and motion, and tells a new story: Chaewon sails her sloop across a golden sea to a basalt arch that holds the last sun of summer, reaches into the glowing water and wakes in the Pearl Grotto, chooses one of three compass pendants, fastens it at her nape, and is lifted by the tide until the grotto breaks open onto the sea. The palette is sunflower yellow in place of Spirit's red. The application runs as modular React and Three.js code under Vite.

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

Open the local URL printed by Vite and answer the L.A.S.T. gate. Scroll through the story, hold to reach into the water, choose a tide (Lagoon, Jade or Coral), hold to fasten the pendant, hold to quicken the tide, and use the Collection button to reach the pendant carousel. The audio button mutes or unmutes the experience.

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
| Chaewon (every rig, pose and close-up) | `scripts/chaewon/` | CC0 MakeHuman body on its full 163-bone skeleton, shaped to her proportions; an SVG-drawn manga face projected into a 4096 atlas with a high-res eye close-up; hair grown as strands with position-based dynamics and animated by bone chains; a cloth-draped lace sundress; poses authored as intent (IK, aim, contrapposto, anatomical hand shapes); the necklace and its clasp; close-up frames placed by Spirit's face landmarks |
| Sea, sloop, arch, grotto and finale | `scripts/env/` | Procedural meshes: a gaff-rigged sloop built around her bow pose, ink-stroke sea and wake curves, hexagonal basalt columns for the sea arch, the causeway, the Pearl Grotto, the rosette, the shell altar and the breaking column (Voronoi pieces) |
| Trapnest Voyage compass pendant | `scripts/env/pendant.py`, `scripts/item/build_pendant.py` | Eight-point rose, ring, pearl, bail and chain; line-art variants for the story and gold/pearl PBR for the carousel |
| Narration | `scripts/narration/` | Kokoro TTS (`af_heart`) with word timings for the karaoke text boxes |
| Soundtrack | `scripts/music/` | Five drones, a bossa loop and a sea-breeze ambience rendered from the GeneralUser GS SoundFont with numpy synthesis and convolution reverb |
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
