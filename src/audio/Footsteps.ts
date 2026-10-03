import type { SceneSection } from "../engine/SceneSection";
import type { SkeletalMesh } from "../engine/SkeletalMesh";
import { range } from "../data/sections";
const settings = {
  WanderScene: {
    keys: [13, 34],
    fade: [0.33, 0.5, 0.7, 1],
    sound: "footstep_out",
  },
  ApproachScene: {
    keys: [16, 32],
    fade: [0.5, 0.65, 0.85, 1],
    sound: "footstep_out",
  },
  CathedralScene: {
    keys: [3, 6],
    fade: [0.7, 0.75, 0.95, 1],
    sound: "footstep_in",
  },
};
/** Trigger the source round robin at animation-frame crossings, not wall-clock intervals. */
export function footsteps(section: SceneSection, skin: SkeletalMesh) {
  const config = settings[section.name as keyof typeof settings];
  if (!config) return;
  let played = 0;
  section.updates.push(() => {
    const elapsed = skin.elapsed % skin.duration;
    if (elapsed < config.keys[0]) played = 0;
    const [a, b, c, d] = config.fade,
      p = section.progress,
      volume = p <= c ? range(p, a, b, 0, 1) : range(p, c, d, 1, 0);
    for (let i = 0; i < config.keys.length; i++)
      if (elapsed >= config.keys[i] && played === i) {
        section.onAudio(config.sound, volume, true);
        played++;
      }
  });
}
