function AudioToggleGl(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, GLUIElement),
      Inherit(_this, XComponent),
      (_this.fragName = "AudioToggleGl"),
      (_this.contexts = "GLUIElement"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.initClass(FragUIHelper, {
          _type: "UI",
          refName: "ui",
          children: [
            { _type: "glObject", refName: "hit", children: [] },
            { _type: "glObject", refName: "toggle1", children: [] },
            { _type: "glObject", refName: "toggle2", children: [] },
            { _type: "glObject", refName: "toggle3", children: [] },
            { _type: "glObject", refName: "toggle4", children: [] },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      const AUDIO_MANAGER = AudioManager.instance(),
        CONFIG = {
          padding: { inline: 24, block: 40 },
          gap: 8,
          z: 50,
          bar: { width: 6, baseSensitivity: 8 },
          hit: { height: 44 },
          bandFrequencies: [
            { min: 20, max: 600, sensitivity: 0.75 },
            { min: 600, max: 1e3, sensitivity: 1 },
            { min: 1e3, max: 2e3, sensitivity: 1 },
            { min: 1500, max: 22050, sensitivity: 2.75 },
          ],
        };
      (_this.set("hover", !1), _this.flag("animatedIn", !1));
      const TOGGLES = [
        _this.toggle1,
        _this.toggle2,
        _this.toggle3,
        _this.toggle4,
      ];
      function onHover(e) {}
      function onClick() {
        if (!_this.flag("animatedIn")) return;
        const shouldMute = !AUDIO_MANAGER.muted;
        (AUDIO_MANAGER.mute(shouldMute, { duration: shouldMute ? 50 : 200 }),
          _this.hit.seo.attr("aria-pressed", String(shouldMute)));
      }
      function onResize() {
        const { bar: bar, padding: padding, gap: gap, hit: hit } = CONFIG;
        TOGGLES.forEach((toggle, index) => {
          ((toggle.width = bar.width),
            (toggle.height = bar.width),
            toggle.setZ(CONFIG.z),
            (toggle.y = Stage.height - padding.block),
            (toggle.__originalY = toggle.y),
            (toggle.__finalX =
              Stage.width - padding.inline - (TOGGLES.length - index) * gap),
            (toggle.__maxX =
              Stage.width - padding.inline - TOGGLES.length * gap),
            (toggle.x = toggle.__finalX));
        });
        const lastToggle = TOGGLES[TOGGLES.length - 1];
        ((_this.hit.x = TOGGLES[0].__finalX - gap),
          (_this.hit.y = TOGGLES[0].y - hit.height / 2),
          (_this.hit.width =
            lastToggle.__finalX + bar.width - TOGGLES[0].__finalX + 2 * gap),
          (_this.hit.height = hit.height),
          _this.hit.setZ(CONFIG.z + 1),
          (_this.hit.group.visible = _this.flag("animatedIn")));
      }
      function loop() {
        const [frequencies, metadata] = AUDIO_MANAGER.getFrequencies(),
          sampleRate = AUDIO_MANAGER.ctx.sampleRate,
          { bufferLength: bufferLength } = metadata;
        AudioUtils.splitFrequencies(frequencies, {
          bufferLength: bufferLength,
          sampleRate: sampleRate,
        }).forEach((value, index) => {
          const { bandFrequencies: bandFrequencies, bar: bar } = CONFIG,
            toggle = TOGGLES[index],
            sensitivity = bandFrequencies[index].sensitivity,
            easedValue = (function easeInSine(x) {
              return 1 - Math.cos((x * Math.PI) / 2);
            })(value),
            scale = Math.max(
              1,
              easedValue *
                bar.baseSensitivity *
                sensitivity *
                toggle.__scale.value,
            );
          ((toggle.scaleY = scale),
            (toggle.y = toggle.__originalY - (bar.width * scale) / 2));
        });
      }
      ((_this.toggleShader = _this.createFragment(Shader, "AudioToggleShader", {
        tNoise: {
          value: Utils3D.getRepeatTexture(
            "assets/images/story/clouds_noise.png",
          ),
        },
        tScene: { value: null },
        uHover: { value: 0 },
        uShow: { value: 0 },
        transparent: !1,
      })),
        (_this.onInit = async function () {
          (Config.NO_UI && (_this.ui.group.hidden = !0),
            GLUI.Stage.add(_this.ui),
            _this.onResize(onResize),
            _this.startRender(loop),
            await Promise.all([
              ...TOGGLES.map((toggle) => toggle.ready),
              _this.hit.ready,
            ]),
            _this.toggleShader.set("tScene", World.NUKE.prevFrameRT));
          for (const toggle of TOGGLES)
            (toggle.useShader(_this.toggleShader),
              (toggle.__scale = { value: 1 }));
          (window.GLSEO && GLSEO.registerPersist(_this.ui, "audio-toggle"),
            _this.hit.interact(onHover, onClick, "#", "Toggle audio", {
              role: "button",
            }),
            _this.animateSet(),
            _this.listen("Global/loaderFinished", () => _this.animateIn()));
        }),
        (_this.animateSet = function () {
          (_this.flag("animatedIn", !1), _this.toggleShader.set("uShow", 0));
        }),
        (_this.animateIn = async function () {
          (await _this.toggleShader
            .tween("uShow", 1, 800, "easeOutSine", 3e3)
            .promise(),
            (_this.hit.group.visible = !0),
            _this.flag("animatedIn", !0));
        }),
        (onInit = _this.onInit === onInit ? null : _this.onInit));
      for (let key in _this)
        if (_this[key]?.then) {
          let store = _this[key];
          (store.then((val) => (_this[key] = val)), _promises.push(store));
        }
      (_promises.length && (await Promise.all(_promises)),
        (_promises = null),
        _this.flag?.("__ready", !0),
        onInit ||
          "AudioToggleGl" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }