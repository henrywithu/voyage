function UILAssetFile(_data, _index, _params) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, ViewStateElement),
      Inherit(_this, XComponent),
      (_this.fragName = "UILAssetFile"),
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
              click: "$onClick",
              _type: "article",
              refName: "file",
              children: [],
            },
          ],
        }),
        _this.createState(),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      const markupOptions = {
        image: `\n        <figure>\n            <img class="thumbnail" src="${_this.data.url}" alt="${_this.data.filename}">\n            <figcaption>\n                <p>${_this.data.filename}</p>\n            </figcaption>\n        </figure>`,
        file: `\n        <p>${_this.data.filename}</p>`,
      };
      (_this.createState(),
        _this.state.set(
          "markup",
          markupOptions[
            (function getMarkupType() {
              return _this.data.type.includes("image") ? "image" : "file";
            })()
          ],
        ),
        (_this.file.div.innerHTML = _this.state.markup),
        (_this.onClick = (event) => {
          (event.preventDefault(), _this.fire("click", { id: _this.data.id }));
        }),
        _this.element.goob(
          "\n    & {}\n\n    .file {\n        padding: var(--spacing-small);\n        text-align: center;\n\n        &:hover {\n            outline: 1px solid var(--color-action);\n            cursor: pointer;\n        }\n    }\n\n    .thumbnail {\n        display: block;\n        margin-bottom: calc(var(--spacing-small) / 2);\n    }\n",
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
          "UILAssetFile" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }