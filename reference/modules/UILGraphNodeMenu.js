function UILGraphNodeMenu(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "UILGraphNodeMenu"),
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
              _type: "div",
              refName: "wrapper",
              children: [
                {
                  className: "iconButton",
                  click: "$onSceneClick",
                  _type: "div",
                  refName: "sceneButton",
                  children: [],
                },
                {
                  className: "iconButton",
                  click: "$onLockClick",
                  _type: "div",
                  refName: "lockButton",
                  children: [],
                },
                {
                  className: "iconButton",
                  click: "$onVisibilityClick",
                  _type: "div",
                  refName: "visibilityButton",
                  children: [],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      (_this.sceneButton.hide(),
        _this.sceneButton.html(UILGraphLayout.SCENE_ICON),
        _this.sceneButton
          .classList()
          [_this.params.data.scenelayout ? "remove" : "add"]("hidden"),
        _this.lockButton.html(
          _this.params.data.locked
            ? UILGraphLayout.LOCKED_ICON
            : UILGraphLayout.UNLOCKED_ICON,
        ),
        _this.visibilityButton.html(
          _this.params.data.visible
            ? UILGraphLayout.VISIBILE_ICON
            : UILGraphLayout.INVISIBLE_ICON,
        ),
        _this.params.data.special &&
          _this.visibilityButton.classList().add("hidden"),
        (_this.onLockClick = (_) =>
          _this.params.data.set("locked", !_this.params.data.locked)),
        (_this.onVisibilityClick = (_) =>
          _this.params.data.set("visible", !_this.params.data.visible)),
        (_this.onSceneClick = (_) =>
          (window.location.search = `?p=${_this.params.data.scenelayout}&uil`)),
        (_this.onInit = function () {
          (_this.lockButton.css({ pointerEvents: "all" }),
            _this.bind(_this.params.data, "locked", (value) => {
              (_this.lockButton.html(
                value
                  ? UILGraphLayout.LOCKED_ICON
                  : UILGraphLayout.UNLOCKED_ICON,
              ),
                _this.fire("UILGraph/LockNode", {
                  id: _this.params.data.id,
                  layoutId: _this.params.layoutId,
                  value: value,
                }),
                value &&
                  _this.set(
                    `UIL/${_this.params.layoutId}/UILGraph/node/focused`,
                    null,
                  ));
            }),
            _this.bind(_this.params.data, "visible", (val) => {
              (_this.visibilityButton?.html(
                val
                  ? UILGraphLayout.VISIBILE_ICON
                  : UILGraphLayout.INVISIBLE_ICON,
              ),
                _this.events.fire(UILGraphNode.TOGGLE_VISIBILITY, {
                  ..._this.params.data.toJSON(),
                  visible: val,
                }));
            }));
        }),
        _this.element.goob(
          "\n    .wrapper {\n        display: flex;\n        margin-right: 5px;\n        color: var(--color-icon-default);\n        align-items: right;\n    }\n\n    .iconButton.hidden {\n        display: none;\n    }\n\n",
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
          "UILGraphNodeMenu" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }