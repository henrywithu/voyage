function UILPanelToolbar(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "UILPanelToolbar"),
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
          children: [{ _type: "input", refName: "filterInput", children: [] }],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit,
        _state = new Map();
      function restoreFolderState() {
        (_this.parent.folder.forEachFolder((folder) => {
          _state.get(folder) ? folder.open() : folder.close();
        }),
          _state.clear());
      }
      function onInput(e) {
        if (!_this.filterInput.div.value.length)
          return (restoreFolderState(), _this.parent.folder.showChildren());
        _this.parent.folder.filter(_this.filterInput.div.value);
      }
      function onFocus() {
        (!(function saveFolderState() {
          _this.parent.folder.forEachFolder((folder) => {
            _state.set(folder, folder.isOpen());
          });
        })(),
          _this.filterInput.css({ border: "1px solid #37a1ef" }));
      }
      function onBlur() {
        _this.filterInput.css({ border: "1px solid #2e2e2e" });
      }
      function onKeyPressed(e) {
        if (27 === e.keyCode)
          return (
            (_this.filterInput.div.value = ""),
            restoreFolderState(),
            _this.parent.folder.showChildren()
          );
      }
      ((_this.ready = !1),
        (function initListeners() {
          (_this.filterInput.div.addEventListener("input", onInput, !1),
            _this.filterInput.div.addEventListener("keydown", onKeyPressed, !1),
            _this.filterInput.div.addEventListener("focus", onFocus, !1),
            _this.filterInput.div.addEventListener("blur", onBlur, !1));
        })(),
        (_this.onMounted = () => {
          _this.ready = !0;
        }),
        (_this.eliminate = function () {
          (_this.filterInput.div.removeEventListener("input", onInput, !1),
            _this.filterInput.div.removeEventListener(
              "keydown",
              onKeyPressed,
              !1,
            ),
            _this.filterInput.div.removeEventListener("focus", onFocus, !1),
            _this.filterInput.div.removeEventListener("blur", onBlur, !1));
        }),
        (_this.filter = function (text) {
          ((_this.filterInput.div.value = text), onInput());
        }),
        (_this.filterSingle = async function (text) {
          ((_this.filterInput.div.value = text),
            _this?.parent?.folder?.filterSingle(_this.filterInput.div.value));
        }),
        (_this.getDataForFolder = function (node_id) {
          _this?.parent?.folder?.getChildrenIds(node_id);
        }),
        (_this.getParentFolder = function () {
          return _this?.parent?.folder;
        }),
        (_this.hideAll = function () {
          _this.flag("init") ||
            (_this.flag("init", !0), this.filterSingle("xxxxxx"));
        }),
        _this.element.goob(
          "\n    & {\n        background-color: var(--panel-background-color);\n        padding: calc(var(--spacing-small) / 2);\n        padding-bottom: 0;\n    }\n",
        ),
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
          "UILPanelToolbar" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }