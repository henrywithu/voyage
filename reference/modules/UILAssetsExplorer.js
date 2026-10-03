function UILAssetsExplorer(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "UILAssetsExplorer"),
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
              _type: "dialog",
              refName: "explorer",
              children: [
                {
                  className: "header",
                  _type: "header",
                  refName: "unnamed",
                  children: [
                    {
                      className: "title",
                      _type: "h2",
                      _innerText: "Assets Library",
                      refName: "unnamed",
                      children: [],
                    },
                    {
                      _type: "button",
                      refName: "closeButton",
                      children: [
                        {
                          className: "sr-only",
                          _type: "span",
                          _innerText: "Close",
                          refName: "unnamed",
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _type: "div",
                  refName: "explorerContent",
                  children: [
                    {
                      className: "compressed-option",
                      _type: "div",
                      refName: "unnamed",
                      children: [
                        {
                          _type: "button",
                          _innerText: "Sync To Folder",
                          refName: "syncButton",
                          children: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let monitorChangeInterval,
        onInit = _this.onInit;
      async function syncClick() {
        try {
          !(async function monitorChanges(dirHandle) {
            let previousFileStates = {};
            (clearInterval(monitorChangeInterval),
              (monitorChangeInterval = setInterval(async () => {
                for await (const entry of dirHandle.values())
                  if ("file" === entry.kind) {
                    const file = await entry.getFile();
                    ((previousFileStates[file.name] &&
                      previousFileStates[file.name].lastModified ===
                        file.lastModified) ||
                      UILStorage.uploadAsset(file),
                      (previousFileStates[file.name] = file));
                  }
              }, 500)));
          })(await window.showDirectoryPicker());
        } catch (err) {
          console.error("Error selecting directory:", err);
        }
      }
      async function updateData() {
        ((_this.data = await Data.request("assets", () => {})),
          _this.tabs.updateContent([
            {
              id: "image",
              label: "Image",
              content: _this.data.images,
              active: 0 == _this.tabs.state.activeIndex,
              disabled: !1,
              hidden: !1,
              draggable: !1,
              hideToobar: !0,
            },
            {
              id: "geometry",
              label: "Geometry",
              content: _this.data.geometries,
              active: 1 == _this.tabs.state.activeIndex,
              disabled: !1,
              hidden: !1,
              draggable: !1,
            },
            {
              id: "video",
              label: "Video",
              content: _this.data.videos,
              active: 2 == _this.tabs.state.activeIndex,
              disabled: !1,
              hidden: !1,
              draggable: !1,
            },
            {
              id: "audio",
              label: "Audio",
              content: _this.data.audios,
              active: 3 == _this.tabs.state.activeIndex,
              disabled: !1,
              hidden: !1,
              draggable: !1,
            },
            {
              id: "other",
              label: "Other",
              content: _this.data.other,
              active: 4 == _this.tabs.state.activeIndex,
              disabled: !1,
              hidden: !1,
              draggable: !1,
            },
          ]));
      }
      ((_this.data = {}),
        (_this.onMounted = async () => {
          (_this.flag("isReady", !0),
            (function initListeners() {
              (_this.closeButton.click(_this.close),
                _this.syncButton.div.addEventListener("click", syncClick),
                _this.events.sub(UILStorage.UPLOADED, updateData));
            })(),
            (_this.tabs = _this.initClass(
              UILAssetsExplorerTabs,
              [
                {
                  id: "image",
                  label: "Image",
                  content: _this.data.images,
                  active: !0,
                  disabled: !1,
                  hidden: !1,
                  draggable: !1,
                  hideToobar: !0,
                },
                {
                  id: "geometry",
                  label: "Geometry",
                  content: _this.data.geometries,
                  active: !1,
                  disabled: !1,
                  hidden: !1,
                  draggable: !1,
                },
                {
                  id: "video",
                  label: "Video",
                  content: _this.data.videos,
                  active: !1,
                  disabled: !1,
                  hidden: !1,
                  draggable: !1,
                },
                {
                  id: "audio",
                  label: "Audio",
                  content: _this.data.audios,
                  active: !1,
                  disabled: !1,
                  hidden: !1,
                  draggable: !1,
                },
                {
                  id: "other",
                  label: "Other",
                  content: _this.data.other,
                  active: !1,
                  disabled: !1,
                  hidden: !1,
                  draggable: !1,
                },
              ],
              [_this.explorerContent],
            )));
        }),
        (_this.ready = (_) => _this.wait("isReady")),
        (_this.testCallback = () => console.log("test callback")),
        (_this.open = async (fileSelectedCallback, startIndex = 0) => {
          (await _this.ready(),
            await updateData(),
            _this.explorer.div.showModal(),
            _this.tabs.setActiveTab(startIndex),
            _this.tabs.updateTabWidth(),
            (_this.testCallback = fileSelectedCallback));
        }),
        _this.listen("UILAssetFile/click", (event) => {
          (_this.testCallback(event.id), _this.close());
        }),
        (_this.close = () => {
          _this.explorer.div.close();
        }),
        _this.element.goob(
          "\n    & {\n        --close-button-size: 20px;\n        pointer-events: all;\n    }\n    \n    .explorer {\n        background-color: var(--color-neutral-20);\n        color: var(--font-color-base);\n        border: none; \n        border-radius: 12px;\n        padding: 0;\n        width: min(980px, calc(100vw - var(--spacing)));\n        max-height: calc(100% - var(--spacing) * 2);\n    }\n\n    .header {\n        background-color: var(--color-neutral-40);\n        padding: var(--spacing-small);\n        text-align: center;\n        position: relative;\n    }\n    \n    .title {\n        font: var(--label2);\n        margin: 0;\n    }\n\n    .closeButton {\n        border: none;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        width: var(--close-button-size);\n        height: var(--close-button-size);\n        padding: calc(var(--spacing-small) / 2);\n        position: absolute;\n        top: calc(var(--spacing) / 1.75);\n        right: calc(var(--spacing) / 1.75);\n\n        &:after,\n        &:before {\n            background-color: var(--color-neutral-70);\n            content: '';\n            display: block;\n            width: calc(var(--close-button-size) / 1.75);\n            height: 1px;\n            transform: rotate(45deg);\n            position: absolute;\n            transition: color var(--duration) var(--timing);\n        }\n\n        &:after {\n            transform: rotate(-45deg);\n            transform-origin: center;\n        }\n\n        &:hover {\n            background-color: transparent;\n\n            &:before,\n            &:after {\n                background-color: var(--font-color-base);\n                \n            }\n        }\n\n        &:focus {\n            outline-offset: calc(var(--spacing-small) / 4);\n        }\n    }\n\n    .explorerContent {\n        position: relative;\n    }\n\n    .compressed-option {\n        font: var(--label3);\n        color: var(--color-neutral-80);\n        position: absolute;\n        top: var(--spacing-small);\n        right: var(--spacing-small);\n        z-index: 1;\n        \n        &:hover {\n            cursor: pointer;\n            color: var(--color-action);\n        }\n    }\n\n    .regular-checkbox,\n    .checkbox-control {\n        cursor: pointer;\n    }\n",
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
          "UILAssetsExplorer" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }