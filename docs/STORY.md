# Trapnest Voyage: story bible

**Trapnest Voyage** retells the Trapnest Spirit experience as a sun-drenched voyage. The scroll structure, manga line-art rendering, motion and interactions are the same as Spirit. The heroine, the story, the palette, the key item, the narration and the music are new.

## Logline

On an endless golden shore at the end of summer, Chaewon follows a melody that hums her name to a stone gate holding the setting sun. Inside a golden hall she finds three Trapnest Voyage elixirs and chooses one. The first sip lifts her into the light and sets her down again, dyed in its colour, while the hall breaks apart into an open golden sky. The voyage was never a place. It was a taste.

## Heroine: Chaewon

- **Who she is:** a woman in her early twenties. Charming, playful and quietly daring. She smiles before she decides, and she never turns down an invitation.
- **Look (from the reference photo):** very slim and long-legged, with fair skin. Long, straight, dark hair parted near the centre, with wispy see-through bangs that fall to her brows and face-framing strands in front of her shoulders. Large dark eyes with a defined upper lash line and soft straight brows, full lips. In the manga rendering her skin is white paper, her hair is ink-black with white shine lines, and her irises are tinted in close-ups.
- **Outfit:** a short white floral-lace sundress with spaghetti straps, a V-neck bodice and a flared mini skirt with a scalloped lace hem. She is barefoot. After she drinks, the dress takes on the colour of the elixir she chose, from the hem upwards.
- **Body language:** an upright, graceful walk; a playful contrapposto with a hand on her hip at the pedestal; she sweeps or tucks her hair behind her ear; her head tilts when she is curious.
- **Build:** a CC0 MakeHuman base mesh shaped for her proportions, with procedural dress and hair. She is re-fitted to every rig and pose that the saint used. See `scripts/character/`.

## Key item: the Trapnest Voyage elixir

A single key item replaces Spirit's liquor bottles: a hand-blown glass flask holding a "sea" of sunlight elixir, with a brass compass-rose stopper and a wax-sealed label. It comes in three tides:

| Tide | Notes | Colour |
| --- | --- | --- |
| **Lagoon** | Yuzu, sea salt & blue lagoon | blue `#63c4f4` |
| **Jade** | Lime, matcha & fresh mint | green `#97f3ad` |
| **Coral** | White peach, hibiscus & coral | coral `#ff9b8a` |

The tide she picks colours the levitation beam, her irises in the close-up, her dress, and the collection that follows.

## Environments

| Spirit | Voyage |
| --- | --- |
| A land of nothingness in the mist | An endless golden shore under a dark sky, with drifting sea haze |
| An ominous monolith with a red portal | A great stone gate whose round window holds the last light of summer |
| Red cathedral of columns | A golden hall of columns, warm as late afternoon |
| Bottles on a pedestal | Three elixir flasks glowing on a pedestal like a small sun |
| Deep red sky behind crumbling pillars | An endless golden sky beyond the breaking colonnade |
| Colosseum | The open-air amphitheatre of the golden coast |

## Scene by scene

1. **Wander.** Title: *Trapnest Voyage*. Chaewon walks barefoot across the shore. The close-up panels show her face behind her hair, then both hands sweeping her hair back.
2. **Profile.** With her hair tucked behind her ear and streaming in the wind, she sees what she came for.
3. **Approach.** She climbs the steps toward the gate. Inset: her bare feet on the stone.
4. **Near.** She stands at the threshold, and the wind tugs at her hair and skirt.
5. **Hand.** Her fingertips reach into the light (the hold interaction).
6. **Target / transition.** Her silhouette fills the round window, and she steps through.
7. **Golden hall.** A close-up of her eyes, then the walk toward the pedestal.
8. **Selection.** Three elixirs. She waits, hand on hip, head tilted, for the reader to choose.
9. **Pour & drink.** Her hand pours the elixir into the glass, and she drinks. Her dress takes the colour.
10. **Antigravity.** Her eyes widen and her irises turn the colour of the tide as she floats in the vortex.
11. **Pillar crumble.** She drifts down, and the columns crack and float away.
12. **Colosseum.** *The Trapnest Voyage*.
13. **Editorial.** *Sail away, stay golden*. Collection, the three tides, and harbours forthcoming.

## Narration

The narration is read by a warm female voice (Kokoro TTS, `af_heart`). Each text box highlights its words as they are spoken. The script lives in `scripts/narration/narration.json`, and `scripts/narration/generate.py` produces the audio and the word timestamps.

1. On an endless shore of golden sand, a lone figure drifts barefoot through the haze.
2. A warm breeze whispers her name. Chaewon sweeps the hair from her eyes and looks around, curious and unafraid.
3. Chaewon finally catches a glimpse of what she has been chasing since she first set sail.
4. At the sight of it, she stands taller, chin raised, a playful smile tugging at her lips.
5. A great stone gate rises before Chaewon, and the humming seems to pour straight from it. The last light of summer burns through the round window at its heart. Not quite believing her eyes, she pauses on the steps and lets the warm air steady her racing pulse.
6. No time to waste. She means to see it through.
7. As she climbs toward the gate, the melody swells, sweet and reckless, and shakes her to the core. The light begins to pulse, beckoning her closer.
8. A warm wind rushes past, playful and expectant. Standing at the threshold, she lifts her hand.
9. Slowly, her fingertips reach for the light.
10. Taking a deep breath, she steps through.
11. For one heartbeat the world goes quiet. Her mind races to catch up. Then she wakes in a golden hall of columns, warm as a late summer afternoon.
12. Before her, a pedestal glows like a small sun.
13. Three Trapnest Voyage elixirs gleam on the pedestal, each one holding a different sea. Chaewon tilts her head and smiles. Somehow they are calling to her, daring her to choose.
14. Chaewon sips, and in an instant a beam of light lifts her off her feet, swirling with *(the tide's notes)*, a tide that carries her past the horizon.
15. Chaewon drifts gently back to the floor, one bare foot after the other, her lace dress now dyed with the color of the elixir.
16. A rumble of breaking stone fills the air. The columns crack and float away, opening onto an endless golden sky.

## Music

The soundtrack is in D major, against Spirit's E minor, and follows the same scroll crossfades. `scripts/music/compose.py` renders it.

| Track | Plays during | Character |
| --- | --- | --- |
| Golden Shore | Wander to Approach | Warm Lydian pads, slow strings and a celesta that glints over the sea haze |
| The Gate | Approach to the hall | A deep D pedal, low strings and horns swelling toward the gate |
| Golden Hall | The hall to Antigravity | Choir and strings swelling chord by chord, harp rolls, no low end |
| Lift | Antigravity | Harp arpeggios, pulsing synth, tremolo strings, choir and a horn melody at about 125 BPM |
| Open Sky | Pillar crumble to the editorial | Sparse guitar harmonics and kalimba over air, a flute phrase |
| Bossa | The editorial | Nylon guitar, upright bass, brushes, Rhodes and a vibraphone melody at 123 BPM |
| Sea breeze | The shore | Wind and two slow waves |

## Palette

Spirit's red is replaced by sunflower yellow (`#f4bd28`), with `#c88e00` for yellow text on white paper and a warm amber behind the gate's window. The tides are Lagoon `#63c4f4`, Jade `#97f3ad` and Coral `#ff9b8a`. The values live in `src/data/theme.ts`.
