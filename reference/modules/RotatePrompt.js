function RotatePrompt(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "RotatePrompt"),
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
            {
              addSrOnly: !0,
              class: "heading3",
              splitType: "lines, words",
              animType: "words",
              text: "$copy",
              _type: "XText",
              refName: "text",
              children: [],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      if (!Config.NO_ROTATE) {
        ((_this.copy = "Please rotate<br>your device."),
          (_this.ready = Promise.create()),
          (_this.onInit = function () {
            const query = window.matchMedia("(orientation: landscape)");
            (toggleVisible(query.matches),
              (query.onchange = ({ matches: matches }) => {
                toggleVisible(matches);
              }));
          }),
          (_this.onMounted = async () => {
            (await _this.wait("text"),
              _this.animateSet(),
              _this.ready.resolve());
          }),
          (_this.animateSet = function () {
            _this.text.animateSet();
          }),
          (_this.animateIn = async function (delay = 200) {
            await _this.text.animateIn(delay, { stagger: 10 });
          }),
          (_this.animateOut = function (delay = 0) {
            _this.animateSet();
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
            "RotatePrompt" !== _this.fragName ||
            !_this.onInit ||
            _this.onInit.calledInit ||
            (onInit = _this.onInit),
          onInit &&
            (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
      }
      function toggleVisible(isLandscape) {
        const showPrompt = Boolean(isLandscape && Device.mobile);
        (_this.element.attr("data-show", String(showPrompt)),
          showPrompt ? _this.animateIn() : _this.animateSet());
      }
    })();
  }