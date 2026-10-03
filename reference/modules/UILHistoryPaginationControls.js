function UILHistoryPaginationControls(_data, _index, _params) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, ViewStateElement),
      Inherit(_this, XComponent),
      (_this.fragName = "UILHistoryPaginationControls"),
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
              className: "pagination",
              _type: "nav",
              refName: "unnamed",
              children: [
                {
                  href: "#",
                  click: "$handlePreviousClick",
                  _type: "a",
                  _innerText: "$state.previousLabel",
                  refName: "btn",
                  children: [],
                },
                {
                  _type: "div",
                  refName: "paginationBtnWrapper",
                  children: [
                    {
                      data: "$parent.paginatedData",
                      view: "UILHistoryPaginationButton",
                      _type: "ViewState",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
                {
                  href: "#",
                  click: "$handleNextClick",
                  _type: "a",
                  _innerText: "$state.nextLabel",
                  refName: "btn",
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
      (_this.createState(),
        _this.state.set("previousLabel", "<"),
        _this.state.set("nextLabel", ">"),
        (_this.handlePreviousClick = () => {
          _this.parent.updatePaginationIndex(
            _this.parent.state.currentPageIndex - 1,
          );
        }),
        (_this.handleNextClick = () => {
          _this.parent.updatePaginationIndex(
            _this.parent.state.currentPageIndex + 1,
          );
        }),
        _this.element.goob(
          "\n    & {\n        display: flex;\n        justify-content: center;\n        align-items: center;\n    }\n\n    .pagination,\n    .paginationBtnWrapper {\n        display: flex;\n        justify-content: center;\n        align-items: center;\n        gap: calc(var(--spacing-small) / 2);\n    }\n\n    .pagination {\n        background-color: var(--color-neutral-20);\n        justify-content: space-between;\n        padding: var(--spacing-small);\n        width: 100%;\n        overflow-x: auto;\n    }\n\n    .btn {\n        background-color: transparent;\n        color: var(--color-white);\n        border-radius: 4px;\n        display: block;\n        font: var(--label3-simi);\n        line-height: 1;\n        text-decoration: none;\n        padding: calc(var(--spacing-small) / 4) calc(var(--spacing-small) / 2);\n\n        &.active {\n            background-color: var(--color-action);\n        }\n    }\n",
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
          "UILHistoryPaginationControls" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }