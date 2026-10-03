function UILTabsContentItem(_data, _index, _params) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, ViewStateElement),
      Inherit(_this, XComponent),
      (_this.fragName = "UILTabsContentItem"),
      (_this.contexts = "Element,ViewStateElement"),
      (_this.data = _data),
      (_this.index = _index),
      (_this.params = _params),
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
              _type: "article",
              refName: "contentContainer",
              children: [
                { _type: "UILPanelToolbar", refName: "toolbar", children: [] },
                {
                  id: "$data.label",
                  options: "$folderOptions",
                  _type: "UILFolder",
                  refName: "folder",
                  children: [],
                },
              ],
            },
          ],
        }),
        _this.createState(),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.ready = !1),
        (_this.folderOptions = { hideTitle: !0, drag: !1 }),
        (_this.onMounted = () => {
          ((_this.ready = !0), _this.set("container", _this.contentContainer));
        }),
        _this.data.bind("content", async (value) => {
          value &&
            (await _this.wait(() => _this.ready),
            await defer(),
            "function" == typeof value
              ? (destroyToolbar(),
                destroyFolder(),
                (function addHydraObject(hydraObject) {
                  _this.initClass(hydraObject, _this.data, [
                    _this.contentContainer,
                  ]);
                })(value))
              : value instanceof UILFolder || (value && Array.isArray(value))
                ? (function addFolder(folders) {
                    Array.isArray(folders) || (folders = [folders]);
                    folders
                      .filter((folder) => !_folders.includes(folder))
                      .forEach((folder) => {
                        (_folders.push(folder), _this.folder.add(folder));
                      });
                  })(value)
                : "object" == typeof value &&
                  (destroyToolbar(),
                  destroyFolder(),
                  (function addHTML(markup) {
                    _this.contentContainer.add(markup);
                  })(value)));
        }));
      let _folders = [];
      function destroyToolbar() {
        _this.toolbar.destroy();
      }
      function destroyFolder() {
        (_this.folder.destroy(), (_folders = []));
      }
      (_this.element.goob(
        "\n    & {\n        height: 100%;\n        max-height: 100vh;\n        overflow-y: auto;\n        \n        .UILPanel.global & {\n            max-height: calc(100vh - 40px);\n            padding-bottom: 40px;\n        }\n    }\n\n    .UILPanel.history & {\n        .contentContainer {\n            height: 100%;\n        }\n    }\n    \n",
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
          "UILTabsContentItem" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }