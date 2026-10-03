function DebugDroneGains(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "DebugDroneGains"),
      (_this.contexts = "Element"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.initClass(FragUIHelper, {
          _type: "UI",
          refName: "unnamed",
          children: [
            { _type: "span", _innerText: "0", refName: "value1", children: [] },
            { _type: "span", _innerText: "0", refName: "value2", children: [] },
            { _type: "span", _innerText: "0", refName: "value3", children: [] },
            { _type: "span", _innerText: "0", refName: "value4", children: [] },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      const AUDIO_MANAGER = AudioManager.instance(),
        DP = 4;
      function updateGains() {
        const g1 = AUDIO_MANAGER.getAudio("drone_1").gain.gain.value,
          g2 = AUDIO_MANAGER.getAudio("drone_2").gain.gain.value,
          g3 = AUDIO_MANAGER.getAudio("drone_3").gain.gain.value,
          g4 = AUDIO_MANAGER.getAudio("drone_4").gain.gain.value;
        (_this.value1.text(g1.toFixed(DP)),
          _this.value2.text(g2.toFixed(DP)),
          _this.value3.text(g3.toFixed(DP)),
          _this.value4.text(g4.toFixed(DP)));
      }
      ((_this.pollInterval = null),
        (_this.onMounted = () => {
          Config.NO_AUDIO ||
            (function startPolling() {
              _this.pollInterval = setInterval(updateGains, 250);
            })();
        }),
        (_this.onDestroy = () => {
          _this.pollInterval &&
            (clearInterval(_this.pollInterval), (_this.pollInterval = null));
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
          "DebugDroneGains" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }