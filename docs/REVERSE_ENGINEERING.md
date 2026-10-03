# Spirit: reverse engineering record

Reference: https://santionispirits.com/  
Source capture: September 3, 2026.  
Application evidence: `/assets/js/app.1782836328290.js`, `/assets/data/uil.1782836328290.json`, the original HTML and shader pack. The complete formatted application evidence is `reference/production.js`. `reference/app.js` is an earlier partial class extraction and is not the authoritative bundle.

## Reconstruction boundary

The production JavaScript is evidence, not a runtime dependency. The browser application consists of React components, TypeScript scene controllers, a Three.js renderer, GSAP transitions, a Web Audio graph, extracted data and separate GLSL files. No source bundle is evaluated, injected, imported or served by the application. Extraction scripts use the TypeScript syntax tree and literal parsing; application-specific constants are explicitly ported.

Original assets are preserved under `public/assets/`. Scene controllers retain original names so source classes can be compared directly. Editorial text, lettering geometry, texture atlases and SVG artwork are extracted instead of redrawn.

## Evidence and asset inventory

| Evidence                       | Local location                                     | Purpose                                                           |
| ------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------- |
| Complete formatted application | `reference/production.js`                          | Original class bodies, runtime semantics, timing and interactions |
| Extracted application classes  | `reference/modules/`                               | Focused scene/UI/shader-controller comparison                     |
| UIL configuration              | `reference/uil.json`, `uil.pretty.json`            | Scene transforms, shader values, text, active particle behaviors  |
| Original HTML/CSS              | `reference/index.html`, `src/styles/reference.css` | Fonts, CSS variables, layout, breakpoints and markup              |
| Original shader pack           | `reference/compiled.vs`                            | Shader bodies and include dependencies                            |
| Asset provenance               | `reference/asset-provenance.json`                  | Observed URL, download status, bytes and SHA-256                  |
| Geometry inventory             | `reference/geometry-inventory.json`                | Decoded output, attributes, bones and vertex counts               |

The inventory contains **308 source-observed candidates**. **298 files** were downloaded successfully, totaling **47,437,302 bytes**: 84 geometry files, 83 images, 112 audio files, 16 font files, one narration-data file, one favicon and one Lottie animation. This includes all 47 MP3 alternatives selected by `AudioConfig.FILE_TYPE` when Ogg is unavailable. Sixty-six packed geometry/animation files were decoded. There are **188 original GLSL/include files**, plus three generated particle behavior fragments assembled from the original active UIL blocks.

Ten historical candidates returned the site's HTML fallback instead of the requested binary: `data/cms.json`; the two obsolete hashed glass meshes; the old `indulgenowatonelater` lettering; the old hashed liquid; three obsolete border geometries; and two FPO flavor-label images. Exact paths remain in the provenance ledger. These HTML responses were not installed as assets. Current scene data references recovered alternatives. Three obsolete OTF font fallbacks referenced in the original CSS remain unavailable; the preceding original WOFF2 files are present and used.

### Reproducible extraction

Run from the repository root:

```sh
python3 scripts/fetch-assets.py
node scripts/decode-geometry.mjs
node scripts/extract-source.mjs
node scripts/extract-narrative.mjs
node scripts/extract-particles.mjs
node scripts/extract-product-data.mjs
```

Fetching uses only the recorded public URLs. Decoding uses the original Draco packing structure, retaining position, normal, UV/UV2, vertex attributes, bone hierarchy and per-frame offset/scale/orientation arrays. The decoded `.mesh` files contain a JSON header followed by aligned typed-array payloads. Original binaries remain available alongside these derivatives. Check each script's output before replacing a capture with a later live-site version.

## Application architecture

- `src/App.tsx` owns loading, consent, accessible navigation, the DOM section stack and the audio/renderer lifetime.
- `src/components/SourceArt.tsx` renders extracted SVG and editorial DOM trees. Named source refs allow independent scene controllers to animate their original DOM elements.
- `src/data/` contains extracted layouts, group transforms, shader defaults/settings, text, narrative layout rules and particle/product configuration.
- `src/engine/Experience.ts` owns input, inertial scrolling, gaze/fixed cameras, render targets, section updates, composite rendering and teardown.
- `src/engine/RenderQuality.ts` separates the original GPU-tier canvas/scene DPR policies and antialiasing decisions; `npm run check:render` checks the recovered desktop/mobile fixtures.
- `src/engine/TextureSampling.ts` and `MaterialFacing.ts` adapt source PBR samplers, double-sided transparency and front/back shader semantics to Three.js. Their regression checks are included in `check:render`.
- `src/engine/SceneSection.ts` provides typed scene loading, transforms, visibility, resize, entry/leave, render-pass and disposal hooks.
- `src/scenes/` holds separate controllers for the narrative, portal, architecture, bottle selection, pouring, antigravity, floating frames and editorial/product sections.
- `src/audio/` owns track metadata, Web Audio routing, source frame-keyed footsteps and the GL audio meter.
- `src/shaders/original/` retains the recovered shader sources. `src/shaders/particles/` contains the source-derived active particle programs. Vite imports them as raw modules and rebuilds on shader edits.
- `src/engine/session.ts` retains reading state in Vite HMR data. A fresh navigation still requires age consent.

### Loader, consent and supporting UI

`Loader.tsx` retains the original half-speed Lottie, three-second minimum and overlapping fade. `AgeGate.tsx` uses the original clipped layout and entry/exit sequence, feeding DOM button centers and pointer tilt into `AgeGateControls.ts` with the original shader and atlas font. No consent is persisted across a fresh page navigation.

`NoisyBorder.tsx` implements the source eight-Hz SVG paths: six vertical samples for HeaderMenu and nine for CookieNotice. The cookie notice uses the original country list, public geo endpoint, storage keys, `?cookieNotice` test condition and 4.5-second entry delay. Analytics/marketing integrations are not installed. `RotatePrompt.tsx` retains the actual-mobile landscape condition and original text. Its physical-device presentation is not yet verified.

`WiggleBoneSpring.ts` preserves the hand's source transform wrappers, stiffness 0.01, damping 0.1 and fixed 0.85 integration steps. `noise.ts` ports the original eight-sinusoid noise used for fingers/wrists. The original Mouse.tilt convention is [-1, 1], with positive Y upward; wrist X uses 0.8 and held wrist Y uses 0.2. The hand-information pass has section clipping; the inverse inset temporarily disables it. Water starts with zero height/history and alpha one.

### Render and coordinate conventions

The reference camera uses a 35-degree vertical field of view and a distance of 5 world units. One viewport is `2 * tan(35° / 2) * 5` world units high. Sections are positioned from the measured DOM stack, keeping responsive editorial content and world-space scenes aligned. A second, fixed camera matrix excludes gaze and camera tilt for source shaders that require screen-aligned projection.

The frame sequence updates input/cameras, the mouse-fluid field, visible scenes and narration; runs offscreen scene passes; renders the world into a source-tier multisampled color target (or uses the recovered FXAA fallback); applies the original composite; then draws the screen-space controls. Screen-space shader resolution follows the active render target rather than using a single viewport resolution for all passes.

Canvas DPR follows `RenderManager.getDPR`; world/color-target DPR follows `Tests.getDPR`. They are not interchangeable. GPU identifier tiers preserve the recovered desktop/mobile caps, oversized fallback and 2/4-sample MSAA selection. Shader DPR uniforms follow the source controller's canvas-versus-scene choice. On the current 2× desktop display both the reference and local canvas now measure 2560 × 1440 at a 1280 × 720 viewport. Opaque Safari GPU identification remains a limitation: the source's canvas-hash/CPU fingerprinting fallback is not reproduced. This does not establish physical-device performance parity.

Colosseum's title deliberately retains `uScreenHeightWorld = 1`; its controller never binds the story camera height. The scene border still uses the actual camera height. Applying the generic height update to both caused a severely enlarged title, caught by a matched-scroll browser comparison.

The shader adapter resolves original `#require`, `#!SHADER`, `#test` and draw-buffer directives explicitly. It deduplicates inherited declarations, adapts attributes/varyings to GLSL 3 and supplies the original shared uniforms. Conditional source blocks use explicit known browser/mobile/renderer conditions; unknown conditions throw instead of being evaluated as JavaScript.

Serialized layers with an empty shader name use the production SceneLayout fallback shader rather than being dropped. This is visible in ApproachScene, where the dark textured back-face of the moon is an ordinary geometry layer whose shader field is intentionally blank.

Raw source colors are preserved without Three.js output tone mapping. Color-valued uniforms use `THREE.Color` so source hex setters behave correctly. Original PNG uploads use premultiplied alpha; this matters particularly for the blue-noise atlas, whose alpha is also random data. Omitting premultiplication produced a visibly brighter, smoother image. The source PBR environment/lightmap textures explicitly opt out.

### Input and scrolling

The desktop wheel path applies the source platform multiplier (0.33 on macOS, 0.25 on Windows), velocity decay of 0.9, input interpolation of 0.5 and story interpolation of 0.08. Actual mobile devices use the high-response 0.9 story interpolation path. A narrow desktop viewport retains desktop scrolling; gaze is disabled either on mobile or below 768 px. Camera gaze follows the pointer with source movement amplitude 0.5; scroll velocity produces a bounded ±0.2-radian tilt.

The original noisy hold cursor and scrollbar use recovered GLSL. Portal, pour and antigravity sections expose hold regions; bottle selection uses geometry hit testing. Touch hold/drag blocks scrolling while engaged. The product slider uses an infinite index, interpolation 0.3, 1.2-second cubic settling, 20-pixel touch-axis intent and a 1.5 touch drag multiplier. Source button labels update with the nearest visible flavor. Carousel flavor and story-selected flavor are distinct state, matching the original separation.

The scene input controller handles `pointercancel` as release-only, clearing hold/scrollbar state without firing a selection click. The listener is removed during teardown, matching the source's cancellation-to-end lifecycle.

Floating panels use geometry hits on pointer input, with the source one-second cubic `uHover` transition; scrolling alone does not recompute their hover. Bottle selection differs: GLUICursor polls its colliders, but magnetic UV coordinates come from Interaction3D pointer events. Local UV sampling now preserves that distinction. HMR reinitializes the selection animation from the retained flavor rather than forcing the initial Orange default again.

## Scene inventory

Heights below are viewport multiples where fixed; editorial rows use measured auto heights. Intermediate widths interpolate the source desktop/mobile height settings.

| Scene           | Height / layout      | Recovered content and behavior                                                                                                                                               |
| --------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wander          | 2.5                  | Original title mesh/distance and opacity maps; sky/background reveal; walking skeleton; wind/ground ribbons; shadow; two floating portraits; narration; footstep keys 13/34  |
| Profile         | 1.25                 | Original saint pose and hair cards; shared wind/breathe/bend uniforms; 2.5-second posture entrance; outward wind; skewed border; narration                                  |
| Approach        | 2 → 1.25             | Portal and authored moon back-face; structures, stairs and shadows; delayed close-step/border entrance; responsive root transforms; animated walking inset; footstep keys 16/32 |
| Near            | 3 → 1.25             | Original structure/character/ground/shadows; portal ribbons; responsive scale and depth; narration                                                                           |
| Hand            | 1.5                  | Arm skeleton; pointer projection; sticky viewport-sized portal; color and hand-information passes; finite-difference water; inverse-view inset; hold interaction             |
| Target          | max(100vw, 75dvh)    | Original cathedral target geometry and portal cutout; responsive root scale; border progression                                                                              |
| Transition      | 2 → 1.5, margin −0.1 | Original transition shader and overdraw ordering                                                                                                                             |
| Cathedral       | 4, margin −0.5       | Interior geometry, original table/bottles/lighting/line shaders; eye and walk frames; narration; indoor footstep keys 3/6                                                    |
| Drink Selection | 2.5                  | Three original bottles, plinths and shadows; raycast selection; source complete-turn rotation, magnetic movement, elevation, spiral wind and blob particles                  |
| Drink Pour      | 4                    | Original arm and drinking skeletons; bottle-bone attachment; 64-segment ballistic liquid ribbon; shadows; hold/pour progression and drinking inset                           |
| AntiGravity     | 2 → 1.8              | Widening eyes, original skin/beam/floor shaders; leaves and drawn vortex; curved wind; 3/6-second hold speed-up and release transitions                                      |
| Pillar Crumble  | 1.25                 | Original fracture attributes/shaders; projected pointer influence; dust ribbons; profile inset and narration                                                                 |
| Colosseum       | 3.25                 | Original architectural geometry, floating rocks and title; pointer rock interaction; dust; flavor-colored saint                                                              |
| Taste           | Auto                 | Source SVG/DOM copy; original animated lettering; responsive entry offsets and stagger                                                                                       |
| Collection      | Auto                 | Original glass/liquid meshes, four text labels, animated card, line/glyph; source title refraction and liquid mask; pointer wobble                                           |
| Products        | Auto                 | Original glass bottle, cork, label atlas and liquid; three original title/copy meshes; infinite slider, refracted titles, custom cursor, source entry and responsive scaling |
| Retail          | Auto                 | Source glyph, side labels and “Select Houses Forthcoming” heading                                                                                                            |
| Footer          | Auto                 | Original footer shader/artwork, contact, social, credits and legal links                                                                                                     |

## Particle and fluid systems

`MouseFluid.ts` ports the original velocity/pressure solver: 128-square simulation, 512-square dye field, three pressure iterations, curl strength 18, time step 1/60, velocity/density dissipation 0.95/0.97 and pressure dissipation 0.9. Original advection, divergence, curl, vorticity, pressure, gradient, splat and display shaders are isolated files. Mouse/scroll splats and the held portal orbit feed the source shaders.

`CurveParticles.ts` adapts Hydra Antimatter/Proton to ping-pong floating-point targets. Lifecycle and active behavior blocks are extracted from UIL, not guessed from inactive editor entries. Particle counts are 200 for selection blobs, 500 for leaves and 200 for drawn particles. Curves are sampled into 256-texel position/tangent maps. Source sphere/plane subdivisions, random channels, lifetimes, easing and render passes are retained.

Selection blobs follow the source spiral, include an inverse shell and release over 200 ms. Leaves emit every 100 ms, follow the source curve and respond to the fluid field with strength 4. Drawn particles use the original vortex/curl blocks and a 7 ms spawn cadence while held. Mobile pull strength is 0.01 versus 0.005 on desktop.

Spawn event flags now follow the original independent two-frame clearing queue; drawing uses an actual 7 ms timer, while GPU updates retain the separate 40/30 Hz gates. `RenderClock.ts` recovers the median-of-31 refresh-rate sampling and distinguishes the sampled HZ multiplier from elapsed frame time. Lifecycle HZ remains its setup value; Proton behavior refreshes HZ at 10 Hz. Fluid dissipation uses sampled HZ as in the source. A zero-length splat still gets a tiny deterministic offset to avoid undefined division. Particle frame cadence, random seeds and absolute-time noise are not synchronized with the live capture.

The portal's reverse camera inherits the source BaseCamera FOV of 30 degrees, while the story uses 35. Its color pass writes RGB even at zero alpha, which is required by the inverse composite. The water solver retains the source elapsed-time 60 Hz gate without catch-up substeps. Pointer tilt spans [-1, 1] with positive Y upward; the pouring arm clamps that input over [-0.5, 0.5].

## Refraction, typography and products

`FontAtlas.ts` uses the original BMFont JSON/PNG pairs, glyph advances, kerning, wrapping, line metrics and animation/karaoke attributes. `SourceText.ts` restores GLText's vertical centering, which corrected the carousel labels' baseline. Narrative text uses the original word timing data and audio files.

`RefractionTexture.ts` renders source text into a separate target and applies eight original Kawase passes. Bottle blur buffers use a 0.2 size ratio; glass uses 0.8. Collection glass has an additional liquid mask target. Text geometry is rendered via matrix-sharing proxies, preserving its main-scene parents. `LiquidMotion.ts` preserves the original velocity/angular response and wobble decay/frequency constants.

PBR lookup textures clamp with nearest sampling and no mipmaps; environment maps clamp with linear sampling and no mipmaps. Environment/lightmap uploads disable premultiplied alpha. The source's misspelled `shader_double_side_trasparency` mode draws back then front, unlike ordinary single-pass double-sided materials. Three.js reverses winding for its back pass, so the adapter negates `gl_FrontFacing` in that compiled variant and supplies a distinct program-cache key. Original shader files remain unchanged.

Product color pairs are source values: blue `#6fccfb / #0362fc`, green `#84dba3 / #14c251`, yellow `#fdeb87 / #fdd90d`. Collection blue differs: `#63c6f8 / #0062ff`. Label atlas offsets are 0, 0.5 and 0.25. The title meshes contain the original custom lettering; this is not a substitute font treatment.

## Trapnest Spirit adaptation

The original capture remains checksum-protected evidence. Public branding is applied in authored runtime/source layers: semantic metadata and canonical/social tags, the L.A.S.T. gate, a GL opening title, editorial/narration text transformation, top-left/footer identity, three product-marker vectors and two separate bottle atlases for narrative/selection/pour and product PBR scenes. The three flavor colors and UV offsets remain source-derived. Illustration-led OG and favicon assets live under `public/assets/social/` and `public/assets/favicon/`.

`wrangler.jsonc` serves `dist/` through Cloudflare Workers Static Assets with SPA fallback. `_headers` supplies no-cache HTML, immutable asset caching and conservative browser security headers. These files prepare deployment only; they do not modify Cloudflare DNS or account state.

## Audio

The original OGG and MP3 effects/ambient alternatives and MP3 narration are local. `catalog.ts` records paths, base gains, loop membership, frequency bands and round-robin counts. Format selection uses the original Ogg capability check and `?forceMP3` override. MP3 loop bounds use the original 0.01 amplitude threshold and 50 ms start offset; narration does not receive this trimming. The round-robin index progression preserves the source formula, including its non-sequential step.

Five drones crossfade with cosine/sine equal-power gains at Approach, Cathedral, AntiGravity and Taste progress bounds. Jazz fades in over Taste; wind follows source world-scroll ranges. The graph has separate drone gain, portal low-pass, cursor stereo pan and the 800 Hz antigravity filter branch. Mute controls the source main/master gain structure and respects document visibility.

Pour audio uses progression thresholds 0.24–0.28 plus start/stop one-shots; drinking triggers at frame 132. Selection levitation follows section progression; bottle hover/selection and carousel actions use the original effects. Footsteps are bound to skeleton frame crossings. The header meter uses the original AudioToggleShader and four analyser bands from a 256-point FFT, source sensitivity/easing, 6-pixel bar width and 8-pixel spacing.

The general/portal/pan effects fade during menu navigation while drone transitions pause, then resume with the source smoothing. Vortex filtering uses cosine/sine wet/dry gains. The pillar crack waits for forward entry; drinking gain follows scroll throughout playback. Narration queues on box reveal, waits for idle, fades on exit and resets with return navigation. Highlight timing reads AudioContext time, and eligibility includes the scene's current visibility even when its controller is culled. Exact listening parity and mobile audio-resume behavior still require comparison. See the coverage ledger rather than interpreting asset recovery as proof of audio parity.

## Development and resource ownership

Vite HMR rebuilds TypeScript and raw shader imports. The reading session retains consent, scroll, selected flavor, elapsed story time and mute preference. Each Experience disposes listeners, RAF, render targets and section resources. Sections own their generated geometry/materials, texture targets and GSAP state; source asset caches can be re-uploaded by the next renderer. Pending async setup checks cancellation at component boundaries. Audio contexts and source nodes are released when the owning app effect is replaced.

Build output and browser behavior are separate checks. A green build confirms type checking/bundling; the coverage ledger records which viewports, scene states and interactions have actually been compared.
