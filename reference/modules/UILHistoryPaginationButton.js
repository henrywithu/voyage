function UILHistoryPaginationButton(_data, _index, _params) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, ViewStateElement),
      Inherit(_this, XComponent),
      (_this.fragName = "UILHistoryPaginationButton"),
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
              href: "#",
              click: "$handleClick",
              _type: "a",
              _innerText: "$data.label",
              refName: "btn",
              children: [],
            },
          ],
        }),
        _this.createState(),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      function calculateDisplay() {
        let {
          pageCount: pageCount,
          maxButtonCount: maxButtonCount,
          index: index,
        } = _this.data.toJSON();
        if (
          ((pageCount -= 1),
          !(pageCount <= 0 || pageCount <= maxButtonCount - 1))
        ) {
          if (
            ((_this.visibleButtonIndexes = [0, pageCount]),
            (0 === _this.currentPageIndex &&
              _this.currentPageIndex === pageCount) ||
              _this.visibleButtonIndexes.push(_this.currentPageIndex),
            pageCount > maxButtonCount &&
              (1 === index && _this.currentPageIndex > 1
                ? setEllipsis("start")
                : removeEllipsis(),
              index === pageCount - 1 && _this.currentPageIndex <= pageCount - 2
                ? setEllipsis("end")
                : removeEllipsis()),
            (_this.visibleButtonIndexes = [
              ...new Set(_this.visibleButtonIndexes),
            ]),
            _this.visibleButtonIndexes.length < maxButtonCount)
          ) {
            let fillButtonCount =
              maxButtonCount - _this.visibleButtonIndexes.length;
            if (_this.currentPageIndex <= Math.ceil(pageCount / 2))
              for (let i = 0; i < fillButtonCount; i++)
                (_this.visibleButtonIndexes.push(
                  _this.currentPageIndex + (i + 1),
                ),
                  fillButtonCount--);
            else if (_this.currentPageIndex >= Math.floor(pageCount / 2))
              for (let i = 0; i < fillButtonCount; i++)
                (_this.visibleButtonIndexes.push(
                  _this.currentPageIndex - (i + 1),
                ),
                  fillButtonCount--);
          }
          _this.hidden = !_this.visibleButtonIndexes.includes(index);
        }
      }
      function setEllipsis(position) {
        const indexes = { start: 1, end: _this.data.pageCount - 2 };
        ((_this.data.label = "..."),
          _this.btn.classList().add("disabled"),
          _this.visibleButtonIndexes.push(indexes[position]));
      }
      function removeEllipsis() {
        _this.btn.classList().remove("disabled");
      }
      function setActive(value) {
        value
          ? _this.btn.classList().add("active")
          : _this.btn.classList().remove("active");
      }
      function setDisplay() {
        _this.hidden
          ? _this.element.classList().add("hidden")
          : _this.element.classList().remove("hidden");
      }
      ((_this.currentPageIndex = _this.data.currentPageIndex),
        (_this.visibleButtonIndexes = []),
        (_this.hidden = !1),
        calculateDisplay(),
        setDisplay(),
        setActive(_this.data.active),
        (_this.onInit = () => {
          !(function initListeners() {
            _this.listen("UILHistoryTab/updatePaginationIndex", (value) => {
              (console.log("value: ", value),
                (_this.currentPageIndex = value),
                calculateDisplay(),
                setDisplay());
            });
          })();
        }),
        _this.data.bind("active", (value) => {
          setActive(value);
        }),
        (_this.handleClick = () => {
          _this.data.callback(_this.data.index);
        }),
        _this.element.goob(
          "\n    & {\n        display: inline-block;\n        \n        &.hidden {\n            display: none;\n        }\n    }\n\n    .btn {\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        min-width: 26px;\n\n        &.disabled {\n            pointer-events: none;\n        }\n    }\n\n    .has-first-ellipsis {\n        &:after {\n            content: '...';\n        }\n    }\n\n    .has-last-ellipsis {\n        &:before {\n            content: '...';\n        }\n    }\n",
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
          "UILHistoryPaginationButton" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }