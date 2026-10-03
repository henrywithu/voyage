/** Recovered from AudioConfig. Paths, gains, loop membership and round robins are source values. */
export interface Track {
  path: string;
  baseGain: number;
  chain?: "drone" | "vortexFocus" | "portalMove" | "panWithCursor";
}
export const tracks: Record<string, Track> = {};
function add(id: string, path: string, baseGain = 1, chain?: Track["chain"]) {
  tracks[id] = { path, baseGain, chain };
}
export const roundRobins = {
  textbox: 6,
  footstep_in: 7,
  footstep_out: 6,
  carousel: 3,
  bottle_hover: 3,
};
for (const [id, path] of Object.entries({
  textbox: "one-shots/textbox",
  footstep_in: "one-shots/footsteps/inside",
  footstep_out: "one-shots/footsteps/outside",
  carousel: "interactions/carousel",
  bottle_hover: "interactions/bottle/hovers",
}))
  for (let i = 1; i <= roundRobins[id as keyof typeof roundRobins]; i++)
    add(`${id}_${i}`, `${path}/${i}`, id === "textbox" ? 0.8 : 1);
for (let i = 1; i <= 5; i++)
  add(
    `drone_${i}`,
    `drones/${i}`,
    i === 5 ? 0.1 : 1,
    i === 4 ? "vortexFocus" : "drone",
  );
add("jazz", "ambient/jazz", 0.45, "drone");
add("wind", "ambient/wind");
add("pouring", "interactions/pouring/hold");
add("pouring_start", "interactions/pouring/start");
add("pouring_stop", "interactions/pouring/stop");
add("portal_base", "interactions/portal/base");
add("portal_contact", "interactions/portal/contact", 1.25);
add("portal_move", "interactions/portal/move", 2.75, "portalMove");
add("antigravity_vortex_base", "interactions/antigravity/beam");
add("antigravity_speed_up", "interactions/antigravity/speedUp", 1.125);
add("antigravity_spawn", "interactions/antigravity/spawn", 11, "panWithCursor");
add(
  "antigravity_release",
  "interactions/antigravity/release",
  13,
  "panWithCursor",
);
add("bottle_interact", "interactions/bottle/interact");
add("bottle_levitate", "interactions/bottle/levitate");
add("drinking", "one-shots/drinking");
add("ui_click", "one-shots/uiClick");
add("transition_crack", "transitions/crack", 0.75);
export const loopIds = [
  "drone_1",
  "drone_2",
  "drone_3",
  "drone_4",
  "drone_5",
  "wind",
  "jazz",
  "antigravity_vortex_base",
  "pouring",
  "antigravity_speed_up",
  "antigravity_spawn",
  "bottle_levitate",
  "portal_base",
  "portal_contact",
  "portal_move",
];
export const frequencyBands = [
  { min: 20, max: 600, sensitivity: 0.75 },
  { min: 600, max: 1000, sensitivity: 1 },
  { min: 1000, max: 2000, sensitivity: 1 },
  { min: 1500, max: 22050, sensitivity: 2.75 },
];
