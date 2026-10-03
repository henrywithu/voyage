function Config() {
    Inherit(this, Model);
    const _this = this;
    (Object.assign(_this, JSON.parse(window._CONFIG_)),
      (_this.CMS_COPY = JSON.parse(
        document.getElementById("ssgCopy").textContent,
      )),
      (_this.SHOW_AGE_GATE =
        !Hydra.LOCAL || (Hydra.LOCAL && Utils.query("showAgeGate"))),
      _this.PROD ||
        ((_this.NO_AUDIO = Utils.query("noAudio")),
        (_this.DEBUG_AUDIO = Utils.query("debugAudio")),
        (_this.NO_VO = Utils.query("noVo")),
        (_this.NO_DRONES = Utils.query("noDrones")),
        (_this.NO_RETAILERS = Utils.query("noRetailers")),
        (_this.NO_TEXT_BOXES = Utils.query("noTextBoxes")),
        (_this.NO_ROTATE = Utils.query("noRotate")),
        (_this.FORCE_MP3 = Utils.query("forceMP3")),
        (_this.JUMP_TO_SCENE = Utils.query("jumpToScene")),
        (_this.ANCHOR = Utils.query("anchor")),
        (_this.NO_COOKIE_NOTICE = Utils.query("noCookieNotice")),
        (_this.NO_CURSOR = Utils.query("noCursor")),
        (_this.NO_FRAMES = Utils.query("noFrames")),
        (_this.NO_BOTTLE_TEXT = Utils.query("noBottleText")),
        (_this.NO_INTRO_BG = Utils.query("noIntroBg")),
        (_this.NO_UI = Utils.query("noUI"))));
  }