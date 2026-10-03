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
        id: "orange",
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
        id: 14,
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
        id: "marshmallow",
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
      "AN OMINOUS STRUCTURE STANDS BEFORE THE saint, THE HUMMING SOUND SEEMS TO COME FROM ITS DIRECTION. A VIVID LIGHT SHINES THROUGH THE CIRCULAR PORTAL AT THE BASE OF THE great monolith.  NOT COMPLETELY believing IT, THE saint PAUSES FOR A MOMENT TO GET HIS SENSES BACK.";
    state.text1Width = 500;
    state.text2padx = 0.4;
    state.text2pady = -1.5;
    state.text2horizontalAlign = "center";
    state.text2verticalAlign = "center";
    state.text2body = "There's no time.\nHe must see it through the end.";
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
      "THE saint LOSES CONSCIOUSNESS FOR A BRIEF MOMENT. HIS MIND STRUGGLES TO PROCESS WHAT IS HAPPENING. HE AWAKES IN AN EXALTED ROOM LIT BY A WARM LIGHT.";
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
    state.text1Body = "IN FRONT OF HIM A LARGE PEDESTAL PULSATES WITH LIGHT.";
    state.text2PadX = 0.2;
    state.text2PadY = -1;
    state.text2OffsetZ = 0.45;
    state.text2HorizontalAlign = "right";
    state.text2VerticalAlign = "center";
    state.text2Body =
      "THREE SPIRIT BOTTLES GLINT ON THE TABLE, VIBRATING WITH A TANTILIZING SHIMMER. THE SAINT PAUSES SOMEHOW… THEY'RE CALLING TO HIM, INVITING HIM TO INDULGE.";
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
    state.text1Body = "Hesitantly, his hand draws forward.";
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
      "As he approaches the portal, the holy sound grows stronger, shaking him to the core. Light begins to pulsate, inviting him closer.";
    state.text1Width = 440;
    state.text2PadX = 0.2;
    state.text2PadY = 2.5;
    state.text2OffsetZ = 0.45;
    state.text2HorizontalAlign = "right";
    state.text2VerticalAlign = "bottom";
    state.text2Body =
      "A strong wind begins to blow, playful and expectant. Now standing before the portal, he raises a hand…";
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
      "THE saint GENTLY FLOATS BACK TO THE FLOOR, ONE FOOT AFTER THE OTHER. HIS ROBE, NOW SATURATED WITH THE COLOR OF THE MYSTERIOUS LIQUID.";
    state.text1Width = 500;
    state.text2padx = 1;
    state.text2pady = -1;
    state.text2horizontalAlign = "center";
    state.text2verticalAlign = "center";
    state.text2body =
      "The sudden roar of shattering stone fills the air. The columns and roof begin to break apart and lift away, revealing a deep red sky.";
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
      "The saint finally catches a glimpse of what he was seeking since he went on his pilgrimage.";
    state.text1Width = 350;
    state.text2padx = 1.15;
    state.text2pady = -0.5;
    state.text2horizontalAlign = "center";
    state.text2verticalAlign = "center";
    state.text2body =
      "At the sight of it, he stands taller, gaze fixated, and determination burning within.";
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
    state.text1Body = "taking a deep breath, he steps in.";
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
      "In an immense land of nothingness, a lonely figure wanders through the mist.";
    state.text2body =
      "Distant whispers alert the traveller. The saint removes his hood to look around, eyes unsure and fearful.";
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
