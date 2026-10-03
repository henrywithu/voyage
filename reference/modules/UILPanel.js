function UILPanel(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "UILPanel"),
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
              refName: "container",
              children: [
                { _type: "UILPanelToolbar", refName: "toolbar", children: [] },
                {
                  id: "$params.title",
                  options: "$folderOptions",
                  _type: "UILFolder",
                  refName: "folder",
                  children: [],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      (_this.createState(),
        _this.state.set("historyIsOpen", !1),
        _this.state.set("isHovered", !1),
        (_this.ready = !1),
        (_this.id = _this.params.title),
        (_this.folderOptions = { hideTitle: !0, drag: !1 }));
      let _hoverEnterHandler,
        _hoverLeaveHandler,
        _hidden = !1;
      function onHover(e) {
        const isHovered = "over" === e.action;
        (_this.state.set("isHovered", isHovered),
          _this.fire("UILPanel/hover", {
            panelId: _this.id,
            isHovered: isHovered,
            action: e.action,
          }));
      }
      function toggleHistory() {
        (_this.state.set("historyIsOpen", !_this.state.historyIsOpen),
          _this.state.historyIsOpen
            ? _this.element.classList().add("open")
            : _this.element.classList().remove("open"),
          _this.fire("historyPanelToggle", _this.state.historyIsOpen));
      }
      function onKeydown(e) {
        const tagName = e.target?.tagName?.toLowerCase() || "";
        if (e.ctrlKey || e.metaKey) {
          if ("h" == e.key && e.shiftKey) {
            if (
              `${document.activeElement.type}`.includes([
                "textarea",
                "input",
                "number",
              ])
            )
              return;
            (e.preventDefault(),
              _hidden
                ? (function show() {
                    (_this.element.visible(), (_hidden = !1));
                  })()
                : (function hide() {
                    (_this.element.invisible(), (_hidden = !0));
                  })());
          }
          "input" !== tagName &&
            "textarea" !== tagName &&
            ("ArrowLeft" == e.key &&
              e.shiftKey &&
              (e.preventDefault(),
              _this.element.css({ left: 0, right: "auto" })),
            "ArrowRight" == e.key &&
              e.shiftKey &&
              (e.preventDefault(),
              _this.element.css({ left: "auto", right: 0 })),
            ("ArrowUp" != e.key && "ArrowDown" != e.key) ||
              !e.shiftKey ||
              (e.preventDefault(),
              _this.element.div.style.removeProperty("right"),
              _this.element.div.style.removeProperty("left")),
            "c" == e.key &&
              e.shiftKey &&
              (e.preventDefault(),
              _this.folder.forEachFolder((f) => f.close())),
            "o" == e.key &&
              e.shiftKey &&
              (e.preventDefault(),
              _this.folder.forEachFolder((f) => f.open())));
        }
      }
      ((_this.onMounted = () => {
        (_this.element.mouseEnabled(!0),
          (_this.ready = !0),
          _this.params?.options?.hideToolbar && _this.toolbar.element.hide(),
          (function initListeners() {
            (document.addEventListener("keydown", onKeydown, !1),
              "history" === _this.id &&
                (_this.element.show(),
                _this.bind("UILBaseTabs/toggle-history-panel", toggleHistory)));
            !(function initHoverListeners() {
              _this.element.hover
                ? _this.element.hover(onHover)
                : ((_hoverEnterHandler = () => onHover({ action: "over" })),
                  (_hoverLeaveHandler = () => onHover({ action: "out" })),
                  _this.element.div.addEventListener(
                    "mouseenter",
                    _hoverEnterHandler,
                    !1,
                  ),
                  _this.element.div.addEventListener(
                    "mouseleave",
                    _hoverLeaveHandler,
                    !1,
                  ));
            })();
          })());
      }),
        _this.element.classList().add("prevent_interaction3d"),
        _this.element.classList().add(_this.params.title),
        "offscreen" === _this.params?.options?.side &&
          _this.element.classList().add("offscreen"),
        (_this.add = async function (child) {
          return (
            await _this.wait(() => _this.ready),
            await defer(),
            _this.element.show(),
            child instanceof UILBaseTabs
              ? (_this.element.div.prepend(child.element.div), _this)
              : "global" === _this.id && child instanceof UILFolder
                ? (UIL.globalTabs.addGlobalFolder(child), _this)
                : (_this.folder.add(child), _this)
          );
        }),
        (_this.remove = function (x) {
          return (_this.folder.remove(x.id), _this);
        }),
        (_this.get = function (id) {
          return _this.folder.getChildById(id);
        }),
        (_this.find = function (id) {
          return _this.folder.find(id);
        }),
        (_this.filter = function (str) {
          return _this.folder.filter(str);
        }),
        (_this.enableSorting = function (key) {
          return (
            _this.folder.enableSorting && _this.folder.enableSorting(key),
            _this
          );
        }),
        (_this.eliminate = function () {
          (_this.toolbar.eliminate(),
            document.removeEventListener("keydown", onKeydown, !1),
            _this.element.div &&
              _hoverEnterHandler &&
              _hoverLeaveHandler &&
              (_this.element.div.removeEventListener(
                "mouseenter",
                _hoverEnterHandler,
                !1,
              ),
              _this.element.div.removeEventListener(
                "mouseleave",
                _hoverLeaveHandler,
                !1,
              )));
        }),
        (_this.element.div.style.cssText = `\n    --panel-width: ${_this.params?.options?.width || "300px"};\n    --panel-height: ${_this.params?.options?.height || "100vh"};\n    --panel-max-height: ${_this.params?.options?.maxHeight || "100vh"};\n    --timing: ${TweenManager._getEase("easeOutCubic")};\n`),
        _this.element.goob(
          `\n    & {\n        background-color: var(--panel-background-color);\n        width: var(--panel-width);\n        height: var(--panel-height);\n        max-height: var(--panel-max-height);\n        user-select: none;\n        position: absolute;\n        top: 0;\n        left: ${"left" === _this.params?.options?.side ? "0" : "auto"};\n        right: ${"left" !== _this.params?.options?.side ? "0" : "auto"};\n        opacity: 0.6;\n        transition: opacity 0.2s var(--timing);\n        pointer-events: all;\n        border-radius: ${"left" === _this.params?.options?.side ? "0 20px 20px 0" : "20px 0 0 20px"};\n        resize: both;\n        direction: ${"left" !== _this.params?.options?.side ? "rtl" : "ltr"};\n        overflow: hidden;\n\n        .container {\n            direction: ltr;\n            overflow-y: auto;\n            max-height: 100%;\n        }\n\n        &:hover {\n            opacity: 1;\n        }\n    }\n\n    &.history {\n        opacity: 1;\n        transform: translateX(calc(var(--panel-width) + 10px));\n        transition: transform 0.5s ease-out;\n\n        &.open {\n            transform: translateX(0);\n        }\n    }\n`,
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
          "UILPanel" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }