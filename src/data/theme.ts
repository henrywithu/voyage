/** Trapnest Voyage palette: sunflower yellow in place of Spirit's red. */
export const theme = {
  /** Main background and accent yellow. */
  sun: "#f4bd28",
  /** Yellow that stays legible as text on white paper. */
  textOnWhite: "#c88e00",
  /** Karaoke highlight in the narration boxes. */
  highlight: "#db9600",
  /** Amber of the sun caught in the sea arch, and the glow under the water. */
  amber: "#b8820f",
  /** Mid-tone of Chaewon's white lace dress. */
  dress: "#f1ece1",
} as const;

/** The three tides of the Trapnest Voyage compass pendant, in selection order.
 * `drink` is the lace colour once the pearl wakes (the name follows the shader uniform). */
export const tides = [
  { id: "lagoon", name: "Lagoon", color: "#63c4f4", drink: "#53b3e8" },
  { id: "jade", name: "Jade", color: "#97f3ad", drink: "#02f660" },
  { id: "coral", name: "Coral", color: "#ff9b8a", drink: "#ff7562" },
] as const;

/** Pearl colour of the selected tide. */
export const tideColor = (selected: number) => tides[selected].color;
