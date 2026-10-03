function UILFolder(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "UILFolder"),
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
              _type: "a",
              refName: "header",
              children: [
                {
                  htmlFor: "$state.label",
                  _type: "label",
                  _innerText: "$state.label",
                  refName: "unnamed",
                  children: [],
                },
                {
                  _type: "div",
                  _innerText: "☰",
                  refName: "drag",
                  children: [],
                },
              ],
            },
            { _type: "div", refName: "container", children: [] },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      _this.params.options ||
        (_this.params = Object.assign(
          {},
          { id: _this.params },
          { options: restArgs[0] },
        ));
      let _children = {},
        _open = !_this.params.options.closed,
        _visible = !0,
        _order = [],
        _draggable = !1,
        _sortableChildren = !1,
        _headerDrag = !1,
        _hasClipboard = !1;
      _this.params.id;
      function removeDragHandlers() {
        (_this.element.div.removeEventListener("dragstart", dragStart, !1),
          _this.element.div.removeEventListener("dragover", dragOver, !1),
          _this.element.div.removeEventListener("drop", drop, !1));
      }
      function onToggle(event) {
        (_this.state.open ? _this.close() : _this.open(),
          _this.state.open
            ? _this.header.div.focus()
            : _this.header.div.blur());
      }
      function onMouseDown(event) {
        ((_headerDrag = !0),
          _this.header.div.addEventListener("mouseup", onMouseUp));
      }
      function onMouseUp(event) {
        ((_headerDrag = !1),
          _this.header.div.removeEventListener("mouseup", onMouseUp));
      }
      function onKeydown(event) {
        (event.preventDefault(),
          13 === event.which && (_open ? close() : open()));
      }
      function onKeyup(event) {
        (event.preventDefault(),
          _hasClipboard &&
            ("c" == event.key && event.metaKey
              ? (function onCopy() {
                  UILClipboard.copy(_children);
                })()
              : "v" == event.key &&
                event.metaKey &&
                (function onPaste() {
                  UILClipboard.paste(_children);
                })()));
      }
      function onFocus() {
        (_this.element.div.classList.add("active"), (_hasClipboard = !0));
      }
      function onBlur() {
        (_this.element.div.classList.remove("active"), (_hasClipboard = !1));
      }
      function matchItem(str, item) {
        return (
          UILFuzzySearch.search(str, item.id.toLowerCase()) ||
          UILFuzzySearch.search(str, item.label.toLowerCase())
        );
      }
      function dragStart(e) {
        if (!UILFolder.DragLock) {
          if (!_headerDrag)
            return (e.preventDefault(), void e.stopPropagation());
          ((UILFolder.DragLock = _this.state.id),
            e.dataTransfer.setData("text/plain", _this.state.id),
            (e.dataTransfer.effectAllowed = "move"),
            _this.element.css({ opacity: 0.5 }));
        }
      }
      function dragOver(e) {
        (e.preventDefault(), (e.dataTransfer.dropEffect = "move"));
      }
      function drop(e) {
        if (!UILFolder.DragLock) return;
        if (e.dataTransfer.items)
          for (var i = 0; i < e.dataTransfer.items.length; i++)
            if ("file" === e.dataTransfer.items[i].kind) return;
        (e.preventDefault(), (_headerDrag = !1));
        let target = e.currentTarget._this,
          dragging = _this.parent.getChildById(UILFolder.DragLock);
        ((UILFolder.DragLock = null),
          target &&
            target.parent &&
            dragging &&
            (dragging.element.css({ opacity: 1 }),
            dragging.parent.getChildById(target.id) &&
              (e.stopPropagation(),
              target.parent.container.div.insertBefore(
                dragging.element.div,
                target.element.div,
              ),
              (_order = [...target.parent.container.div.childNodes].map(
                (el) => el._this.id,
              )),
              _this.events.fire(UIL.REORDER, { order: [..._order] }),
              (function saveSort() {
                UILStorage.set(
                  `UIL_${UIL.sortKey}_${_this.parent.id}_order`,
                  JSON.stringify(_order),
                );
              })())));
      }
      function getUrlID() {
        return `${Global.PLAYGROUND || "Global"}_folder_${_this.state.id}`;
      }
      function saveFolderState() {
        sessionStorage.setItem(
          getUrlID(),
          JSON.stringify({ open: _this.state.open }),
        );
      }
      ((_this.id = _this.params.id),
        (_this.label = String(_this.params.options.label || _this.params.id)),
        (_this.level = -1),
        _this.createState(),
        _this.state.set("id", _this.params.id),
        _this.state.set("label", _this.params.options.label || _this.params.id),
        _this.state.set("open", !_this.params.options.closed),
        _this.params.options.hideTitle &&
          _this.header.classList().add("hide-title"),
        _this.element.css({
          maxHeight: _this.params.options.maxHeight || "none",
        }),
        _this.element.attr("data-id", _this.params.id),
        _this.element.attr("data-type", "UILFolder"),
        (_this.element.div._this = _this),
        (_this.onInit = () => {
          !(function restoreFolderState() {
            let json = JSON.parse(sessionStorage.getItem(getUrlID()));
            json ? (json.open ? _this.open() : _this.close()) : _this.open();
          })();
        }),
        (_this.onMounted = () => {
          _this.flag("isReady", !0);
        }),
        (_this.ready = (_) => _this.wait("isReady")),
        (function initListeners() {
          (_this.header.div.addEventListener("keydown", onKeydown, !1),
            _this.header.div.addEventListener("click", onToggle, !1),
            _this.header.div.addEventListener("mousedown", onMouseDown),
            _this.header.div.addEventListener("focus", onFocus, !1),
            _this.header.div.addEventListener("blur", onBlur, !1),
            _this.header.div.addEventListener("keydown", onKeyup, !1));
        })(),
        (_this.add = async function (child) {
          return (
            await _this.wait(() => _this.ready),
            await defer(),
            child.draggable && child.draggable(_sortableChildren),
            (child.parent = _this),
            (_children[child.id] = child),
            _this.container.add(child),
            _this
          );
        }),
        (_this.remove = function (x) {}),
        (_this.getChildrenControlIds = function (node_id) {
          const folder = _children[node_id];
          if (!folder) return [];
          const childControlFirebaseKeys = [];
          return (
            folder.forEachControl((child) => {
              childControlFirebaseKeys.push(child.id);
            }),
            childControlFirebaseKeys
          );
        }),
        (_this.getChildById = function (id) {
          return _children[id];
        }),
        (_this.getAll = function () {
          return _children;
        }),
        (_this.getVisible = function () {
          return Object.values(_children).filter((x) => x.isVisible());
        }),
        (_this.find = function (id) {
          return id === _this.id
            ? _this
            : Object.values(_children).reduce(
                (acc, item) =>
                  item.id === id
                    ? acc.concat(item)
                    : item instanceof UILFolder
                      ? acc.concat(item.find(id))
                      : acc,
                [],
              );
        }),
        (_this.filter = function filter(str, match = !1) {
          str = str.toLowerCase();
          let result = [],
            haystack = Object.values(_children);
          for (let el of haystack)
            if (el instanceof UILFolder) {
              let matches = el.filter(str, !0);
              matches.length
                ? (result.concat(matches), el.show(), el.open())
                : matchItem(str, el)
                  ? (result.push(el), el.show(), el.showChildren(), el.close())
                  : el.getVisible().length
                    ? el.show()
                    : el.hide();
            } else
              matchItem(str, el) ? (result.push(el), el.show()) : el.hide();
          return result;
        }),
        (_this.filterSingle = function filterSingle(str) {
          str = str.toLowerCase();
          let haystack = Object.values(_children);
          for (let el of haystack)
            el instanceof UILFolder
              ? (el.filterSingle(str),
                str == el.state.label.toString().toLowerCase() ||
                str == el.state.id.toString().toLowerCase()
                  ? (el.show(), el.showChildren(), el.open(!0))
                  : el.getVisible().length
                    ? el.show()
                    : el.hide())
              : matchItem(str, el)
                ? (el.show(), el.state.open && el.open(!0))
                : el.hide();
          return [];
        }),
        (_this.open = function (keepClosed = !1) {
          if (_this.element)
            return (
              _this.state.set("open", !0),
              _this.element.classList().add("open"),
              (_open = !0),
              1 != keepClosed && _this.forEachFolder((f) => f.close()),
              saveFolderState(),
              _this.onOpen && _this.onOpen(),
              _this
            );
        }),
        (_this.close = function () {
          (_this.state.set("open", !1),
            _this.element.classList().remove("open"),
            (_open = !1),
            saveFolderState());
        }),
        (_this.setLabel = function (label) {
          _this.state.set("label", label);
        }),
        (_this.hide = function () {
          if (_this.element)
            return (
              (_visible = !1),
              _this.element.css({ display: "none" }),
              _this
            );
        }),
        (_this.show = function () {
          if (_this.element)
            return (
              (_visible = !0),
              _this.element.css({ display: "block" }),
              _this
            );
        }),
        (_this.showChildren = function () {
          return (
            Object.values(_children).forEach((el) =>
              el instanceof UILFolder ? el.showChildren() : el.show(),
            ),
            _this.show(),
            _this
          );
        }),
        (_this.isOpen = function () {
          return _open;
        }),
        (_this.isVisible = function () {
          return _visible;
        }),
        (_this.forEachFolder = function (cb) {
          return (
            Object.values(_children).forEach((el) => {
              el instanceof UILFolder && (cb(el), el.forEachFolder(cb));
            }),
            _this
          );
        }),
        (_this.forEachControl = function (cb) {
          return (
            Object.values(_children).forEach((el) => {
              el instanceof UILFolder ? el.forEachControl(cb) : cb(el);
            }),
            _this
          );
        }),
        (_this.enableSorting = function (key) {
          ((_sortableChildren = !0),
            (UIL.sortKey = key),
            Object.values(_children).forEach((el) => {
              el instanceof UILFolder && el.draggable(!0);
            }));
          let order = (function getSort() {
            let sort = UILStorage.get(`UIL_${UIL.sortKey}_${_this.id}_order`);
            if (sort) return JSON.parse(sort);
          })();
          return (
            order &&
              ((_order = order),
              (function restoreSort() {
                _order.forEach((id) => {
                  _children[id] && _this.container.add(_children[id]);
                });
              })()),
            _this
          );
        }),
        (_this.draggable = function (enable) {
          ((_draggable = enable),
            _this.element.attr("draggable", enable),
            enable
              ? (!(function addDragHandlers() {
                  (_this.element.div.addEventListener(
                    "dragstart",
                    dragStart,
                    !1,
                  ),
                    _this.element.div.addEventListener(
                      "dragover",
                      dragOver,
                      !1,
                    ),
                    _this.element.div.addEventListener("drop", drop, !1));
                })(),
                _this.drag && _this.drag.show())
              : (removeDragHandlers(), _this.drag && _this.drag.hide()));
        }),
        (_this.toClipboard = function () {
          UILClipboard.copy(_children);
        }),
        (_this.fromClipboard = function () {
          UILClipboard.paste(_children);
        }),
        (_this.eliminate = function () {
          (_this.params.options.hideTitle ||
            (_this.header.div.removeEventListener("keydown", onToggle, !1),
            _this.header.div.removeEventListener("click", onToggle, !1),
            _this.header.div.removeEventListener("mousedown", onMouseDown),
            _this.header.div.removeEventListener("focus", onFocus, !1),
            _this.header.div.removeEventListener("blur", onBlur, !1)),
            _draggable && removeDragHandlers());
        }),
        (_this.forceSort = function (index) {
          (_this.parent.container.div.insertBefore(
            _this.element.div,
            _this.parent.container.div.children[index],
          ),
            (_order = [..._this.parent.container.div.childNodes].map(
              (el) => el._this.state.id,
            )),
            _this.events.fire(UIL.REORDER, { order: [..._order] }));
        }),
        (_this.openChildren = function () {
          Object.values(_children).forEach((el) =>
            el instanceof UILFolder ? el.open() : null,
          );
        }),
        (_this.onToggle = onToggle),
        UIL.addCSS(
          UILFolder,
          "\n    .UILFolder .UILFolder .UILFolder .header { \n        padding-left: calc(var(--left-padding) + var(--spacing-small)); \n    }\n    .UILFolder .UILFolder .UILFolder .header:before {\n        left: calc(var(--spacing-small) * 2);\n    }\n\n    .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .header {\n        padding-left: calc(var(--left-padding) + var(--spacing-small) * 3); \n    }\n    .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .header:before {\n        left: calc(var(--spacing-small) * 3);\n    }\n\n    .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .header {\n        padding-left: calc(var(--left-padding) + var(--spacing-small) * 4); \n    }\n    .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .header:before {\n        left: calc(var(--spacing-small) * 4);\n    }\n\n    .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .header {\n        padding-left: calc(var(--left-padding) + var(--spacing-small) * 5); \n    }\n    .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .header:before {\n        left: calc(var(--spacing-small) * 5);\n    }\n\n    .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .header {\n        padding-left: calc(var(--left-padding) + var(--spacing-small) * 6); \n    }\n    .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .UILFolder .header:before {\n        left: calc(var(--spacing-small) * 6);\n    }\n\n",
        ),
        _this.element.goob(
          "\n    & {\n        --left-padding: calc(var(--spacing) * 1.75);\n\n        background-color: var(--panel-background-color);\n        width: 100%;\n\n        &:has(> .header:focus) {\n            border: 1px solid var(--color-action--alt);\n        }\n        \n        &.open {\n            > .header:before {\n                transform: rotate(90deg);\n            }\n    \n            > .container {\n                display: block;\n            }\n        }\n    }\n    \n    .header {\n        border-bottom: 1px solid var(--color-divider-main);\n        color: var(--color-white);\n        display: flex;\n        font: var(--label4);\n        padding: var(--spacing-large); \n        padding-left: var(--left-padding);\n        position: relative;\n        align-items: center;\n        text-decoration: none;\n        line-height: 1;\n        user-select: none;\n\n        &:hover {\n            outline: 1px solid var(--color-action--alt);\n        }\n\n        &:before {\n            content: '';\n            display: block;\n            width: 0;\n            height: 0;\n            border-color: transparent transparent transparent var(--color-icon-default);\n            border-style: solid;\n            border-width: 3px 0 3px 4px;\n            position: absolute;\n            left: var(--spacing-small);\n            transition: transform .3s ease-out;\n        }\n\n        &.hide-title {\n            display: none;\n        }\n    }\n\n    .container {\n        display: none;\n    }\n\n    .drag {\n        position: absolute;\n        right: 7px;\n        top: 8px;\n        display: inline-block;\n        pointerEvents: none;\n    }\n",
        ),
        _this.listen("UILGraphLayout/destroy", (label) => {
          let name = label.split("-")[0];
          _this.label.includes(name) && _this.element.hide();
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
          "UILFolder" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }