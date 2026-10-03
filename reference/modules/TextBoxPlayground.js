function TextBoxPlayground(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Frag3D, _params?.sceneLayoutName || "TextBoxPlayground"),
      Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "TextBoxPlayground"),
      (_this.contexts =
        'Frag3D, _params?.sceneLayoutName || "TextBoxPlayground",Element'),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        (_this.text = _this.initClass(
          TextBox,
          AppState.createLocal({
            offsetZ: 0.45,
            horizontalAlign: "center",
            verticalAlign: "bottom",
            body: "An immense land of nothingness.\n        A lonely figure is walking in the mist, weary and lost.\n    ",
            color: "black",
          }),
        )),
        _this.text.isFragment &&
          _promises.push(_this.wait(_this.text, "__ready")),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.onInit = async () => {
        let [input, state] = _this.createUIL("TextBox Animation");
        _this.text.animateSet();
        const bgQuad = new Mesh(
          World.QUAD,
          _this.initClass(Shader, "BGShader"),
        );
        ((bgQuad.shader.depthTest = !1),
          _this.group.add(bgQuad),
          input.addButton("Play Animation", {
            label: "Play Animation",
            actions: [
              {
                title: "Play",
                callback: async () => {
                  (await _this.text.animateSet(),
                    await defer(),
                    await _this.text.animateIn());
                },
              },
            ],
          }),
          _this.text.animateSet(),
          _this.text.animateIn());
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
          "TextBoxPlayground" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }