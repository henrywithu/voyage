function UILControlFile(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, UILControl),
      Inherit(_this, XComponent),
      (_this.fragName = "UILControlFile"),
      (_this.contexts = "UILControl"),
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
              className: "form-group",
              _type: "div",
              refName: "unnamed",
              children: [
                {
                  id: "$state.id",
                  _type: "label",
                  _innerText: "$state.label",
                  refName: "unnamed",
                  children: [],
                },
                {
                  type: "text",
                  id: "geometry-text-input",
                  ariaLabelledBy: "$state.id",
                  placeholder: "$state.placeholder",
                  _type: "input",
                  refName: "inputText",
                  children: [],
                },
              ],
            },
            {
              className: "wrapper",
              _type: "div",
              refName: "unnamed",
              children: [
                {
                  className: "preview",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      type: "file",
                      id: "imageFile",
                      multiple: !0,
                      accept: "file/*",
                      _type: "input",
                      refName: "picker",
                      children: [],
                    },
                    {
                      className: "copy",
                      _type: "div",
                      _innerText: "Drag and drop your file here",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
                {
                  className: "controls",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      _type: "button",
                      _innerText: "Browse Assets",
                      refName: "browseButton",
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.params = Object.assign(
        {},
        { id: _this.params },
        { options: restArgs[0] },
      )),
        _this.state.set("id", _this.params.id),
        _this.state.set("inputFileId", _this.params.id + "-inputFile"),
        _this.state.set("inputTextId", _this.params.id + "-inputText"),
        _this.state.set("placeholder", _this.params.options.relative));
      const ogValues = {
        src: _this.params.options.src || "",
        relative: _this.params.options.relative || "",
        prefix: _this.params.options.prefix || "",
        filename: _this.params.options.filename || "",
      };
      async function openAssetsExplorer() {
        UIL.assetsExplorer.open(onSelectExternalAsset, 1);
      }
      async function onSelectExternalAsset(id) {
        const asset = await UILRemote.getAsset(id);
        ((_this.inputText.div.value = asset.name),
          (_this.value = {
            filename: asset.name,
            prefix: asset.url.split("/").slice(0, -1).join("/"),
            relative: "",
            src: asset.url,
            prefix: "",
          }),
          _this.finish());
      }
      async function change() {
        let file = _this.picker.div.files[0];
        if (!file) return;
        const asset = await UILStorage.uploadAsset(file);
        ((_this.value = {
          filename: asset.name,
          prefix: asset.url.split("/").slice(0, -1).join("/"),
          relative: "",
          src: asset.url,
        }),
          _this.finish());
      }
      async function inputTextChange(event) {
        event.target.value &&
          _this.inputText.val().includes(["World", "SceneLayout", "assets/"]) &&
          ((_this.value = {
            src: _this.inputText.val(),
            relative: _this.inputText.val(),
            prefix: "",
            filename: _this.inputText.val(),
          }),
          _this.finish());
      }
      ((_this.value = Object.assign({}, ogValues)),
        _this.browseButton.classList().add("small"),
        _this.init(_this.params.id, _this.params.options),
        (function initListeners() {
          (_this.browseButton.click(openAssetsExplorer),
            _this.picker.div.addEventListener("change", change, !1),
            _this.inputText.div.addEventListener("change", inputTextChange));
        })(),
        (_this.onInit = () => {
          _this.value &&
            _this.value.src &&
            (_this.state.set("hasFile", !0),
            _this.state.set("fileUrl", _this.value.src),
            (_this.inputText.div.value = _this.value.filename));
        }),
        (_this.force = function (value, isClipboard) {
          _this.picker.div.value = "";
        }),
        (_this.onDestroy = function () {
          _this.picker.div.removeEventListener("change", change, !1);
        }),
        _this.element.goob(
          "\n    & {\n        padding: var(--spacing);\n        padding-bottom: 0;\n        margin-bottom: var(--spacing-small);\n    }\n    \n    .wrapper {\n        border-bottom: 1px solid var(--color-neutral-40);\n        display: flex;\n        gap: var(--spacing);\n        justify-content: space-between;\n        padding: calc(var(--spacing) * 1.5) 0;\n    }\n\n    .controls {\n        display: flex;\n        flex-direction: column;\n        gap: var(--spacing-small);\n    }\n\n    .copy {\n        font: var(--label2);\n        padding: var(--spacing-small);\n        text-align: center;\n        pointer-events: none;\n    }\n    \n    .preview {\n        color: var(--color-neutral-80);\n        border: 1px solid var(--color-neutral-40);\n        border-radius: calc(var(--border-radius) / 2);\n        box-sizing: border-box;\n        position: relative;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        flex: 1;\n        flex-shrink: 0;\n        overflow: hidden;\n        transition-property: border-color, color;\n        transition-duration: var(--duration);\n        transition-timing-function: var(--timing);\n\n        &:hover {\n            border-color: var(--color-action);\n            color: var(--color-action-contrast);\n        }\n    }\n\n    .picker {\n        position: absolute;\n        opacity: 0;\n        inset: 0px;\n\n        &:hover {\n            cursor: pointer;\n        }\n    }\n",
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
          "UILControlFile" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }