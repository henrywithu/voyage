function DragAndDrop(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "DragAndDrop"),
      (_this.contexts = "Element"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      (_this.element.attr("draggable", "true"), (_this.dragEl = _this.element));
      let _dragId,
        initialized = !1;
      function setDragging() {
        _this.set("UIL/Graph/dragging", _this.dragId);
      }
      function removeDragListeners() {
        (_this.set("UIL/Graph/dragging", !1),
          _this.dragEl.div.removeEventListener("mousedown", setDragging, !1),
          window.removeEventListener("mouseup", _this.removeDragListeners, !1),
          _this.dropTarget.classList?.().remove("hover"),
          _this.dragEl.div.removeEventListener(
            "dragstart",
            _this.dragStart,
            !1,
          ),
          _this.dragEl.div.removeEventListener("dragend", _this.dragEnd, !1),
          _this.dropTarget.div.removeEventListener(
            "dragenter",
            _this.dragEnter,
          ),
          _this.dropTarget.div.removeEventListener(
            "dragleave",
            _this.dragLeave,
          ),
          _this.dropTarget.div.removeEventListener("dragover", _this.dragOver),
          _this.dropTarget.div.removeEventListener("drop", _this.drop),
          _this.dragEl?.div?.removeEventListener(
            "mousedown",
            _this.addDragListeners,
            !1,
          ));
      }
      ((_this.setDragEnabled = function (val) {
        (_this.dragEl.attr("draggable", val),
          !1 === val && removeDragListeners());
      }),
        (_this.setDragElement = function (el) {
          (_this.element.div.removeEventListener("mousedown", setDragging, !1),
            _this.element.attr("draggable", !1),
            (_this.dragEl = el),
            _this.dragEl.attr("draggable", !0));
        }),
        (_this.onInit = async function () {
          initialized ||
            ((initialized = !0),
            await _this.wait("dropTarget"),
            (function addDragListeners() {
              if (
                (_this.dragEl.div.addEventListener(
                  "mousedown",
                  setDragging,
                  !1,
                ),
                window.addEventListener(
                  "mouseup",
                  _this.removeDragListeners,
                  !1,
                ),
                !_this.element || !_this.dropTarget)
              )
                return;
              (_this.dragEl.div.addEventListener(
                "dragstart",
                _this.dragStart,
                !1,
              ),
                _this.dragEl.div.addEventListener("dragend", _this.dragEnd, !1),
                _this.dropTarget.div.addEventListener(
                  "dragenter",
                  _this.dragEnter,
                ),
                _this.dropTarget.div.addEventListener(
                  "dragleave",
                  _this.dragLeave,
                ),
                _this.dropTarget.div.addEventListener(
                  "dragover",
                  _this.dragOver,
                ),
                _this.dropTarget.div.addEventListener("drop", _this.drop));
            })(),
            (_dragId = _this.data ? _this.data.id : !!_this.id && _this.id));
        }),
        (_this.onRemoveView = function () {
          removeDragListeners();
        }),
        _this.bind("UIL/Graph/dragging", (isDragging) => {}),
        (_this.dragStart = function (event) {
          (event.stopPropagation(),
            _dragId ||
              console.warn(
                "No Drag Id is set on Drag and Drop. Set either _this.data.id or _this.id on the class inheriting from DragAndDrop",
                _this,
              ),
            event.dataTransfer.setData("text/plain", _dragId),
            (event.dataTransfer.effectAllowed = "move"),
            (event.dropEffect = "move"),
            _this.element.css({ opacity: 0.4 }),
            _this.onDragStart?.(event));
        }),
        (_this.dragEnd = function (event) {
          (event.stopPropagation(),
            _this.onDragEnd?.(event),
            _this.element?.css({ opacity: 1 }));
        }),
        (_this.dragEnter = function (event) {
          (_this.dropTarget.classList().add("hover"),
            _this.onDragEnter?.(event));
        }),
        (_this.dragLeave = function (event) {
          (_this.dropTarget.classList().remove("hover"),
            _this.onDragLeave?.(event));
        }),
        (_this.dragOver = function (event) {
          (event.preventDefault(),
            event.stopPropagation(),
            (event.dataTransfer.dropEffect = "move"),
            _this.onDragOver?.(event));
        }),
        (_this.drop = function (event) {
          return (
            event.stopPropagation(),
            _this.dropTarget.classList().remove("hover"),
            _this.onDrop?.(event.dataTransfer.getData("text")),
            !1
          );
        }),
        _this.element.goob(
          "\n    cursor: pointer;\n    .highlight {\n        pointer-events: none;\n    }\n",
        ),
        "UILGraphGroupChildren" === Utils.getConstructorName(_this) &&
          _this.element.goob(
            "\n        .highlight {\n            background: #1aeade !important;\n        }\n    ",
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
          "DragAndDrop" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }