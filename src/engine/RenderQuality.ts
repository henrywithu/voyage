export interface GpuProfile {
  renderer: string;
  mobile: boolean;
  ios: boolean;
  pixelRatio: number;
  width: number;
  height: number;
}

/** Source GPU/Tests rules. Keep canvas density separate from the scene target. */
export function classifyGpu(profile: GpuProfile) {
  const gpu = profile.renderer.toLowerCase();
  const has = (...names: string[]) => names.some((name) => gpu.includes(name));
  const model = (prefix: string, min: number, max = 99999) => {
    if (!has(prefix)) return false;
    const value = Number(
      gpu
        .split(prefix)[1]
        .split(" ")[0]
        .replace(/[^a-z0-9]/g, ""),
    );
    return value >= min && value < max;
  };
  const blocked =
    !gpu ||
    has(
      "radeon hd 6970m",
      "radeon hd 6770m",
      "radeon hd 6490m",
      "radeon hd 6630m",
      "radeon hd 6750m",
      "radeon hd 5750",
      "radeon hd 5670",
      "radeon hd 4850",
      "radeon hd 4870",
      "radeon hd 4670",
      "geforce 9400m",
      "geforce 320m",
      "geforce 330m",
      "geforce gt 130",
      "geforce gt 120",
      "geforce gtx 285",
      "geforce 8600",
      "geforce 9600m",
      "geforce 8800 gs",
      "geforce 8800 gt",
      "quadro fx 5",
      "quadro fx 4",
      "radeon hd 2600",
      "radeon hd 2400",
      "mali-4",
      "mali-3",
      "mali-2",
      "swiftshader",
      "basic render driver",
      "generic renderer",
      "sgx543",
      "legacy",
      "sgx 543",
    );
  let tier = 0;
  if (!profile.mobile) {
    const low =
      blocked ||
      has(
        "radeon(tm) r5",
        "radeon r9 200",
        "hd graphics family",
        "intel(r) uhd graphics direct",
      ) ||
      model("hd graphics ", 1000, 5001) ||
      (model("hd graphics ", 0, 618) && profile.pixelRatio > 1) ||
      (has("hd graphics", "iris") &&
        Math.max(profile.width, profile.height) > 1800) ||
      has("intel iris opengl engine") ||
      model("iris(tm) graphics ", 1000);
    const integrated =
      !blocked &&
      !low &&
      (model("iris(tm) graphics ", 540, 1000) ||
        model("hd graphics ", 514, 1000) ||
        model("intel(r) uhd graphics ", 600, 1000) ||
        !has("nvidia", "amd", "radeon", "geforce") ||
        has("vega 8"));
    if (integrated) tier = 1;
    if (
      !blocked &&
      !low &&
      !integrated &&
      has("nvidia", "amd", "radeon", "geforce")
    )
      tier = 2;
    if (
      !blocked &&
      (has(
        "titan",
        "amd radeon pro",
        "quadro",
        "amd radeon(tm) graphics direct3d11 vs_5_0",
      ) ||
        model("gtx ", 940) ||
        model("radeon (tm) rx ", 400) ||
        model("radeon rx ", 400) ||
        model("radeon pro ", 420))
    )
      tier = 3;
    if (
      !blocked &&
      (has(
        "titan",
        "quadro",
        "radeon vii",
        "apple m",
        "rtx",
        "radeon pro 5300m",
        "radeon pro 5500m",
        "radeon pro 5600m",
        "amd radeon unknown prototype",
      ) ||
        model("gtx ", 1060) ||
        model("radeon rx ", 500) ||
        model("vega ", 50))
    )
      tier = 4;
    if (
      !blocked &&
      (has("titan", "radeon vii") ||
        model("gtx ", 1080) ||
        model("rtx ", 2060) ||
        model("radeon rx ", 5500) ||
        (has("apple m") && has("max")))
    )
      tier = 5;
  } else if (!blocked) {
    const low =
      (profile.ios && has("a7", "a8", "a9")) ||
      (!profile.ios && has("sgx")) ||
      (has("adreno")
        ? model("adreno (tm) ", 0, 415)
        : has("mali")
          ? model("mali-t", 0, 628)
          : has("mali-g") || model("adreno (tm) ", 420));
    if (
      (profile.ios && has("a10")) ||
      (!profile.ios && !low) ||
      model("mali-g", 73) ||
      model("adreno (tm) ", 600, 616) ||
      model("adreno (tm) ", 530, 600)
    )
      tier = 1;
    if (
      (profile.ios && has("a11", "a12")) ||
      model("adreno (tm) ", 630) ||
      model("mali-g", 74)
    )
      tier = 2;
    if (
      (profile.ios && has("a13", "a14")) ||
      model("adreno (tm) ", 640) ||
      model("mali-g", 76)
    )
      tier = 3;
    if (
      (profile.ios && has("a15", "a16")) ||
      model("adreno (tm) ", 650) ||
      has("mali-g710") ||
      model("mali-g", 78)
    )
      tier = 4;
    if (
      (profile.ios &&
        has(
          "a17",
          "a18",
          "a19",
          "a20",
          "a21",
          "a22",
          "a23",
          "a24",
          "a25",
          "apple m",
        )) ||
      model("adreno (tm) ", 740)
    )
      tier = 5;
  }
  const oversized =
    !profile.mobile &&
    ((tier <= 0 && Math.max(profile.width, profile.height) > 1400) ||
      (tier <= 1 &&
        profile.pixelRatio < 2 &&
        Math.max(profile.width, profile.height) > 1600));
  return { tier, oversized };
}

export function renderQuality(profile: GpuProfile, compat = false) {
  const { tier, oversized } = classifyGpu(profile);
  const cap = profile.mobile
    ? [1, 1.2, 1.35, 1.4, 1.6, 1.8][tier]
    : [1, 1.2, 1.35, 1.5, 2, 2][tier];
  const sceneDpr = oversized
    ? 0.8
    : tier === 0
      ? 1
      : Math.min(profile.pixelRatio, cap);
  // RenderManager.getDPR is deliberately not Tests.getDPR.
  const canvasDpr = oversized
    ? 1
    : !profile.mobile && tier === 0
      ? Math.min(1.3, profile.pixelRatio)
      : !profile.mobile && tier === 1
        ? Math.min(1.8, profile.pixelRatio)
        : profile.mobile && tier <= 2
          ? Math.min(2, profile.pixelRatio)
          : !profile.mobile && tier >= 4
            ? Math.max(1.5, profile.pixelRatio)
            : Math.max(1.25, profile.pixelRatio);
  const samples = compat || tier <= 2 ? 0 : tier === 3 ? 2 : 4;
  const fxaa = samples === 0 && (profile.mobile ? tier > 2 : tier > 1);
  return { tier, oversized, sceneDpr, canvasDpr, samples, fxaa };
}

// Referenced by material uniforms; resized in place so offscreen passes agree.
export const qualityUniforms = {
  sceneDpr: { value: 1 },
  canvasDpr: { value: 1 },
};
