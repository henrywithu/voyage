// Source-derived TextBox parameters and responsive assignments. Regenerate with scripts/extract-narrative.mjs.
import { range } from "./sections";
export interface NarrativeParams {
  id: number | string;
  body: string;
  padx?: number;
  pady?: number;
  offsetZ?: number;
  fontSize?: number;
  padding?: number;
  width?: number;
  lineHeight?: number;
  horizontalAlign?: string;
  verticalAlign?: string;
  color?: string;
  ontop?: boolean;
}
export const narrativeLayouts: Record<
  string,
  (width: number, height: number) => NarrativeParams[]
> = {
  AntiGravityScene: (width: number, height: number): NarrativeParams[] => {
    const state: Record<string, any> = {};
    const isMobile = width / height < 1;
    state.body1 = "";
    state.body2 = "";
    state.body3 = "";
    state.text1PadX = 0.2;
    state.text1PadY = 0;
    state.text1OffsetZ = 0.45;
    state.text1HorizontalAlign = "right";
    state.text1VerticalAlign = "center";
    state.text1Width = 440;
    state.text1PadX = isMobile ? 0 : 0.2;
    state.text1PadY = isMobile ? 1 : 0;
    state.text1HorizontalAlign = isMobile ? "center" : "right";
    state.text1VerticalAlign = "center";
    state.text1Width = 440;
    return [
      {
        padx: state.text1PadX,
        pady: state.text1PadY,
        offsetZ: state.text1OffsetZ,
        horizontalAlign: state.text1HorizontalAlign,
        verticalAlign: state.text1VerticalAlign,
        body: "",
        color: "black",
        width: state.text1Width,
        id: "lagoon",
      },
      {
        padx: state.text1PadX,
        pady: state.text1PadY,
        offsetZ: state.text1OffsetZ,
        horizontalAlign: state.text1HorizontalAlign,
        verticalAlign: state.text1VerticalAlign,
        body: "",
        color: "black",
        width: state.text1Width,
        id: "jade",
      },
      {
        padx: state.text1PadX,
        pady: state.text1PadY,
        offsetZ: state.text1OffsetZ,
        horizontalAlign: state.text1HorizontalAlign,
        verticalAlign: state.text1VerticalAlign,
        body: "",
        color: "black",
        width: state.text1Width,
        id: "coral",
      },
    ];
  },
  ApproachScene: (width: number, height: number): NarrativeParams[] => {
    const state: Record<string, any> = {};
    const isMobile = width / height < 1;
    state.text1padx = 0.4;
    state.text1pady = 1.1;
    state.text1horizontalAlign = "left";
    state.text1verticalAlign = "top";
    state.text1body =
      "A colossal arch of black stone rises from the open water, and the last sun of summer is caught inside it, glowing like a lantern. The wind falls away, and her little boat glides on all by itself.";
    state.text1Width = 500;
    state.text2padx = 0.4;
    state.text2pady = -1.5;
    state.text2horizontalAlign = "center";
    state.text2verticalAlign = "center";
    state.text2body = "No turning back now.\nShe means to see it through.";
    state.text1padx = isMobile ? 0.03 : 0.4;
    state.text1pady = isMobile ? 0.1 : 1.1;
    state.text1Width = isMobile ? 0.5 * width : 500;
    state.text1horizontalAlign = isMobile ? "right" : "left";
    state.text1verticalAlign = "top";
    state.text2pady = isMobile ? -1.7 : -1.5;
    state.text2padx = isMobile ? 0.03 : range(width, 1024, 3400, 0.1, 1.9, !0);
    state.text2horizontalAlign = isMobile ? "left" : "right";
    state.text2verticalAlign = "center";
    return [
      {
        padx: state.text1padx,
        pady: state.text1pady,
        offsetZ: 0.45,
        horizontalAlign: state.text1horizontalAlign,
        verticalAlign: state.text1verticalAlign,
        body: state.text1body,
        color: "black",
        width: state.text1Width,
        id: 5,
      },
      {
        padx: state.text2padx,
        pady: state.text2pady,
        offsetZ: 0.45,
        horizontalAlign: state.text2horizontalAlign,
        verticalAlign: state.text2verticalAlign,
        body: state.text2body,
        color: "black",
        id: 6,
      },
    ];
  },
  CathedralScene: (width: number, height: number): NarrativeParams[] => {
    const state: Record<string, any> = {};
    const isMobile = width / height < 1;
    state.text1PadX = 0.4;
    state.text1PadY = 3;
    state.text1OffsetZ = 0.45;
    state.text1HorizontalAlign = "right";
    state.text1VerticalAlign = "top";
    state.text1Body =
      "For one heartbeat the world goes quiet. Then she wakes in a hall of stone columns, with tide pools glowing gold at her feet.";
    state.text1Width = 440;
    state.text1PadX = isMobile ? 0.03 : 0.4;
    state.text1Width = isMobile ? 0.6 * width : 440;
    return [
      {
        padx: state.text1PadX,
        pady: state.text1PadY,
        offsetZ: state.text1OffsetZ,
        horizontalAlign: state.text1HorizontalAlign,
        verticalAlign: state.text1VerticalAlign,
        body: state.text1Body,
        color: "black",
        width: state.text1Width,
        id: 11,
      },
    ];
  },
  DrinkSelectionScene: (width: number, height: number): NarrativeParams[] => {
    const state: Record<string, any> = {};
    const isMobile = width / height < 1;
    state.text1PadX = 0.2;
    state.text1PadY = 1.5;
    state.text1OffsetZ = 0.45;
    state.text1HorizontalAlign = "left";
    state.text1VerticalAlign = "top";
    state.text1Body = "At the far end, a great shell lies open like an altar.";
    state.text2PadX = 0.2;
    state.text2PadY = -1;
    state.text2OffsetZ = 0.45;
    state.text2HorizontalAlign = "right";
    state.text2VerticalAlign = "center";
    state.text2Body =
      "Above it turn three Trapnest Voyage pendants, each with a pearl that holds a different tide. Chaewon tilts her head and smiles. They are daring her to choose.";
    state.text2Width = 440;
    state.text1PadX = isMobile ? 0.03 : 0.2;
    state.text1PadY = isMobile ? 1 : 1.5;
    state.text1Width = isMobile ? 0.6 * width : 440;
    state.text1OffsetZ = isMobile ? 0.2 : 0.45;
    state.text1HorizontalAlign = isMobile ? "right" : "left";
    state.text2PadX = isMobile ? 0 : 0.2;
    state.text2PadY = isMobile ? -1.4 : -1;
    state.text2OffsetZ = 0.45;
    state.text2HorizontalAlign = isMobile ? "center" : "right";
    state.text2VerticalAlign = "center";
    state.text2Width = isMobile ? 0.65 * width : 440;
    return [
      {
        padx: state.text1PadX,
        pady: state.text1PadY,
        offsetZ: state.text1OffsetZ,
        horizontalAlign: state.text1HorizontalAlign,
        verticalAlign: state.text1VerticalAlign,
        body: state.text1Body,
        color: "black",
        id: 12,
      },
      {
        padx: state.text2PadX,
        pady: state.text2PadY,
        offsetZ: state.text2OffsetZ,
        horizontalAlign: state.text2HorizontalAlign,
        verticalAlign: state.text2VerticalAlign,
        body: state.text2Body,
        color: "black",
        width: state.text2Width,
        id: 13,
      },
    ];
  },
  HandScene: (width: number, height: number): NarrativeParams[] => {
    const state: Record<string, any> = {};
    const isMobile = width / height < 1;
    state.text1PadX = 0.2;
    state.text1PadY = 1;
    state.text1OffsetZ = 0.45;
    state.text1HorizontalAlign = "left";
    state.text1VerticalAlign = "top";
    state.text1Body = "Slowly, her fingertips reach into the light.";
    state.text1Width = 440;
    state.text1PadX = isMobile ? 0.05 : 0.2;
    state.text1PadY = isMobile ? 0.6 : 1;
    return [
      {
        padx: state.text1PadX,
        pady: state.text1PadY,
        offsetZ: state.text1OffsetZ,
        horizontalAlign: state.text1HorizontalAlign,
        verticalAlign: state.text1VerticalAlign,
        body: state.text1Body,
        color: "black",
        width: state.text1Width,
        id: 9,
      },
    ];
  },
  NearScene: (width: number, height: number): NarrativeParams[] => {
    const state: Record<string, any> = {};
    const isMobile = width / height < 1;
    state.text1PadX = 0.2;
    state.text1PadY = 4;
    state.text1OffsetZ = 0.45;
    state.text1HorizontalAlign = "left";
    state.text1VerticalAlign = "bottom";
    state.text1Body =
      "Beneath the arch the sea goes still as glass. A road of light runs across the water, all the way to her feet.";
    state.text1Width = 440;
    state.text2PadX = 0.2;
    state.text2PadY = 2.5;
    state.text2OffsetZ = 0.45;
    state.text2HorizontalAlign = "right";
    state.text2VerticalAlign = "bottom";
    state.text2Body =
      "A warm breath of wind lifts her hair. She steps out onto the stones and kneels at the water's edge.";
    state.text2Width = 440;
    state.text1PadY = isMobile ? 0.6 : 4;
    state.text1PadX = isMobile ? 0 : 0.2;
    state.text1Width = isMobile ? 0.75 * width : 440;
    state.text1VerticalAlign = isMobile ? "top" : "bottom";
    state.text1HorizontalAlign = isMobile ? "center" : "left";
    state.text2PadX = isMobile ? 0.03 : 0.2;
    state.text2PadY = isMobile ? 0.4 : 2.5;
    state.text2Width = isMobile ? 0.6 * width : 440;
    state.text2HorizontalAlign = isMobile ? "left" : "right";
    state.text2VerticalAlign = "bottom";
    return [
      {
        padx: state.text1PadX,
        pady: state.text1PadY,
        offsetZ: state.text1OffsetZ,
        horizontalAlign: state.text1HorizontalAlign,
        verticalAlign: state.text1VerticalAlign,
        body: state.text1Body,
        color: "black",
        width: state.text1Width,
        id: 7,
      },
      {
        padx: state.text2PadX,
        pady: state.text2PadY,
        offsetZ: state.text2OffsetZ,
        horizontalAlign: state.text2HorizontalAlign,
        verticalAlign: state.text2VerticalAlign,
        body: state.text2Body,
        color: "black",
        width: state.text2Width,
        id: 8,
      },
    ];
  },
  PillarCrumbleScene: (width: number, height: number): NarrativeParams[] => {
    const state: Record<string, any> = {};
    const isMobile = width / height < 1;
    state.text1padx = 0.4;
    state.text1pady = 1.1;
    state.text1horizontalAlign = "left";
    state.text1verticalAlign = "top";
    state.text1body =
      "Chaewon drifts gently back down, one bare foot after the other, her lace dress now the color of the pearl.";
    state.text1Width = 500;
    state.text2padx = 1;
    state.text2pady = -1;
    state.text2horizontalAlign = "center";
    state.text2verticalAlign = "center";
    state.text2body =
      "A rumble of breaking stone fills the air. The columns crack and float away, and the grotto opens onto an endless golden sky.";
    state.text2Width = 500;
    state.text1padx = isMobile ? 0.03 : 0.4;
    state.text1pady = isMobile ? 0.33 : 1.1;
    state.text1horizontalAlign = "left";
    state.text1verticalAlign = "top";
    state.text1Width = isMobile ? 0.6 * width : 500;
    state.text2padx = isMobile ? 0.03 : range(width, 1600, 393, 1, 0.05, !0);
    state.text2pady = isMobile ? -1.2 : -1;
    state.text2horizontalAlign = isMobile ? "right" : "center";
    state.text2verticalAlign = "center";
    state.text2Width = isMobile ? 0.7 * width : 500;
    return [
      {
        padx: state.text1padx,
        pady: state.text1pady,
        offsetZ: 0.45,
        horizontalAlign: state.text1horizontalAlign,
        verticalAlign: state.text1verticalAlign,
        body: state.text1body,
        color: "black",
        width: state.text1Width,
        id: 15,
      },
      {
        padx: state.text2padx,
        pady: state.text2pady,
        offsetZ: 0.45,
        horizontalAlign: state.text2horizontalAlign,
        verticalAlign: state.text2verticalAlign,
        body: state.text2body,
        color: "black",
        width: state.text2Width,
        id: 16,
      },
    ];
  },
  ProfileScene: (width: number, height: number): NarrativeParams[] => {
    const state: Record<string, any> = {};
    const isMobile = width / height < 1 || width < 1200;
    state.text1padx = -1.15;
    state.text1pady = 0.5;
    state.text1horizontalAlign = "center";
    state.text1verticalAlign = "center";
    state.text1body =
      "Far off on the horizon, something catches the light.";
    state.text1Width = 350;
    state.text2padx = 1.15;
    state.text2pady = -0.5;
    state.text2horizontalAlign = "center";
    state.text2verticalAlign = "center";
    state.text2body =
      "She lifts her chin and smiles. Whatever it is, she is going to find out.";
    state.text2Width = 350;
    state.text1padx = isMobile ? 0.03 : -1.1;
    state.text1pady = isMobile ? -0.1 : 0.5;
    state.text1Width = isMobile ? 0.63 * width : 350;
    state.text1horizontalAlign = isMobile ? "right" : "center";
    state.text2padx = isMobile ? 0.03 : 1.1;
    state.text2pady = isMobile ? -1 : -0.5;
    state.text2Width = isMobile ? 0.5 * width : 350;
    state.text2horizontalAlign = isMobile ? "left" : "center";
    return [
      {
        padx: state.text1padx,
        pady: state.text1pady,
        offsetZ: 0.45,
        horizontalAlign: state.text1horizontalAlign,
        verticalAlign: state.text1verticalAlign,
        body: state.text1body,
        color: "black",
        width: state.text1Width,
        id: 3,
      },
      {
        padx: state.text2padx,
        pady: state.text2pady,
        offsetZ: 0.45,
        horizontalAlign: state.text2horizontalAlign,
        verticalAlign: state.text2verticalAlign,
        body: state.text2body,
        color: "black",
        width: state.text2Width,
        id: 4,
      },
    ];
  },
  TargetScene: (width: number, height: number): NarrativeParams[] => {
    const state: Record<string, any> = {};
    const isMobile = width / height < 1;
    state.text1PadX = -1;
    state.text1PadY = -0.5;
    state.text1OffsetZ = 0.45;
    state.text1HorizontalAlign = "center";
    state.text1VerticalAlign = "center";
    state.text1Body = "Taking a deep breath, she lets it pull her through.";
    state.text1Width = 440;
    state.text1PadX = isMobile ? 0.03 : -1;
    state.text1PadY = isMobile ? -0.9 : -0.5;
    state.text1HorizontalAlign = isMobile ? "left" : "center";
    state.text1VerticalAlign = "center";
    return [
      {
        padx: state.text1PadX,
        pady: state.text1PadY,
        offsetZ: state.text1OffsetZ,
        horizontalAlign: state.text1HorizontalAlign,
        verticalAlign: state.text1VerticalAlign,
        body: state.text1Body,
        color: "black",
        width: state.text1Width,
        id: 10,
        ontop: !0,
      },
    ];
  },
  WanderScene: (width: number, height: number): NarrativeParams[] => {
    const state: Record<string, any> = {};
    const isMobile = width / height < 1;
    state.text1body =
      "At the end of summer, a small white sloop slips across a golden sea.";
    state.text2body =
      "Chaewon stands at the bow, one hand on the forestay, and lets the wind comb through her hair. Today she has nowhere to be.";
    state.text1Width = 400;
    state.text2Width = 400;
    state.text1padx = isMobile ? 0.03 : 0.4;
    state.text1pady = isMobile ? 4.2 : 1.4;
    state.text1Width = isMobile ? 0.63 * width : 400;
    state.text1horizontalAlign = isMobile ? "right" : "left";
    state.text1verticalAlign = "bottom";
    state.text2padx = isMobile ? 0.03 : 0.4;
    state.text2pady = isMobile ? 0.25 : 0.55;
    state.text2Width = isMobile ? 0.7 * width : 400;
    state.text2horizontalAlign = isMobile ? "left" : "right";
    state.text2verticalAlign = "bottom";
    return [
      {
        padx: state.text1padx,
        pady: state.text1pady,
        offsetZ: 0.45,
        horizontalAlign: state.text1horizontalAlign,
        verticalAlign: state.text1verticalAlign,
        body: state.text1body,
        color: "black",
        width: state.text1Width,
        id: 1,
      },
      {
        padx: state.text2padx,
        pady: state.text2pady,
        offsetZ: 0.45,
        horizontalAlign: state.text2horizontalAlign,
        verticalAlign: state.text2verticalAlign,
        body: state.text2body,
        color: "black",
        width: state.text2Width,
        id: 2,
      },
    ];
  },
};
