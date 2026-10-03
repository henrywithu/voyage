function UILInputNumber(_data, _index, _params) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, ViewStateElement),
      Inherit(_this, XComponent),
      (_this.fragName = "UILInputNumber"),
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
              type: "number",
              ariaLabelledBy: "$data.labelledBy",
              min: "$data.min",
              max: "$data.max",
              step: "$data.step",
              _type: "input",
              refName: "input",
              children: [],
            },
          ],
        }),
        _this.createState(),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let _timeout,
        _distance,
        _onMouseDownValue,
        onInit = _this.onInit,
        _editing = !1,
        _pointer = [0, 0],
        _prevPointer = [0, 0],
        _step = 0.05,
        _onInputCB = () => {},
        _onFinishCB = () => {};
      function setValue(value) {
        if (
          ((value = parseFloat(value).toFixed(_this.data.precision) || 0) <
            _this.data.min && (value = _this.data.min),
          value > _this.data.max && (value = _this.data.max),
          isNaN(Number(value)))
        )
          return (_this.value = 0);
        ((_this.value = Number(value)),
          _this.data.onInputCB(_this.value, _this.master));
      }
      function updateValueAndInput(value, showDecimals = !1) {
        setValue(value);
        let displayValue = showDecimals
          ? parseFloat(_this.value).toFixed(_this.data.precision)
          : _this.value;
        _editing || (_this.input.div.value = displayValue);
      }
      function onBlur() {
        (updateValueAndInput(_this.input.div.value, !0), onFinishChange(!0));
      }
      function onKeyUp(e) {
        13 === e.keyCode &&
          (e.altKey
            ? ((_this.master = !0),
              onInput(),
              _this.data.onFinishCB(_this.value, _this.master))
            : (setValue(_this.value),
              _this.data.onFinishCB(_this.value, _this.master)));
      }
      function onInput() {
        (clearTimeout(_timeout),
          (_timeout = setTimeout(finishInput, 800)),
          (_editing = !0),
          (_this.value = _this.input.div.value));
      }
      function finishInput() {
        isNaN(_this.input.div.value) ||
          (setValue(_this.input.div.value), onFinishChange());
      }
      function onFinishChange(force = !1) {
        (_editing || force) &&
          ((_editing = !1),
          clearTimeout(_timeout),
          _this.data.onFinishCB(_this.value, _this.master),
          updateValueAndInput(_this.input.div.value, !0),
          (_this.master = !1));
      }
      function onMouseDown(e) {
        (1 === e.button || (0 === e.button && e.metaKey) || e.ctrlKey) &&
          (e.preventDefault(),
          _this.input.css({ cursor: "col-resize" }),
          (_distance = 0),
          (_onMouseDownValue = _this.value),
          (_prevPointer = [e.screenX, e.screenY]),
          document.addEventListener("mousemove", onMouseMove, !1),
          document.addEventListener("mouseup", onMouseUp, !1));
      }
      function onMouseMove(e) {
        (clearTimeout(_timeout), (_editing = !0));
        let currentValue = _this.value;
        ((_pointer = [e.screenX, e.screenY]),
          (_distance +=
            _pointer[0] - _prevPointer[0] - (_pointer[1] - _prevPointer[1])));
        let value =
          Number(_onMouseDownValue) +
          Number(_distance / (e.shiftKey ? 5 : 50)) * _step;
        ((value = Math.min(_this.data.max, Math.max(_this.data.min, value))),
          (_this.master = e.altKey),
          currentValue !== value &&
            (function setValueDrag(value) {
              (void 0 === value && value === _this.input.div.value) ||
                (setValue(value),
                (_this.input.div.value = _this.value.toFixed(
                  _this.data.precision,
                )),
                clearTimeout(_this.dragCallback),
                (_this.dragCallback = Timer.create(
                  (_) => _this.data.onFinishCB(_this.value, _this.master),
                  100,
                )));
            })(value),
          (_prevPointer = [e.screenX, e.screenY]));
      }
      function onMouseUp(e) {
        (onFinishChange(),
          _this.input.css({ cursor: "" }),
          document.removeEventListener("mousemove", onMouseMove, !1),
          document.removeEventListener("mouseup", onMouseUp, !1));
      }
      (_this.master,
        _this.dragCallback,
        (_this.onMounted = () => {
          updateValueAndInput(_this.data.value, !0);
        }),
        (function initListeners() {
          (_this.input.div.addEventListener("mousedown", onMouseDown, !1),
            _this.input.div.addEventListener("keyup", onKeyUp, !1),
            _this.input.div.addEventListener("change", onFinishChange, !1),
            _this.input.div.addEventListener("blur", onBlur, !1),
            _this.input.div.addEventListener("input", onInput, !1));
        })(),
        _this.data.bind("value", (value) => {
          updateValueAndInput(value);
        }),
        (_this.getValue = () => _this.value),
        (_this.publicSetValue = (value) => {
          _editing ? setValue(value) : updateValueAndInput(value);
        }),
        (_this.onInput = (cb) => cb),
        (_this.onFinish = (cb) => cb),
        (_this.forceUpdate = function (value) {
          updateValueAndInput(value);
        }),
        (_this.onDestroy = function () {
          (_this.input.div.removeEventListener("mousedown", onMouseDown, !1),
            _this.input.div.removeEventListener("change", onFinishChange, !1),
            _this.input.div.removeEventListener("blur", onBlur, !1),
            _this.input.div.removeEventListener("input", onInput, !1));
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
          "UILInputNumber" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }