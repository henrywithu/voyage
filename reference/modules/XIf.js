function XIf(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "XIf"),
      (_this.contexts = "Component"),
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
      const PARAMS_TO_SANITIZE = [
        "conditionState",
        "fragment",
        "container",
        "as",
        "noAutoAnim",
        "afterRender",
        "afterAnimateIn",
        "afterDestroy",
      ];
      function update(shouldRender) {
        if (shouldRender) {
          if (_this.fragment) return;
          !(async function renderFragment() {
            const resolvedParams = (function getResolvedParams() {
              const result = {};
              for (const key of getSanitizedParamsKeys())
                result[key] = _this.params[key];
              return result;
            })();
            _this.paramsState = AppState.createLocal(resolvedParams);
            const root = _this.params.container ?? _this.parent.element;
            "Element" === _this.params.fragment
              ? (_this.fragment = (function renderElement({
                  params: params,
                  root: root,
                }) {
                  const element = {
                    _type: params.as || "div",
                    _innerText: params.text,
                    refName: null,
                    children: [],
                    addTo: root,
                    ...params,
                  };
                  return _this.createFragment(FragUIHelper, element);
                })({ root: root, params: resolvedParams }))
              : (_this.fragment = _this.createFragment(
                  (function getTargetFragment() {
                    const targetFragment = window[_this.params.fragment];
                    if (!targetFragment)
                      throw new Error(
                        `Target fragment ${_this.params.fragment} doesn't exist`,
                      );
                    return targetFragment;
                  })(),
                  _this.paramsState,
                  [root],
                ));
            (_this.params.afterRender?.(),
              _this.fragment.animateSet?.(),
              _this.params.noAutoAnim ||
                (await _this.fragment.animateIn?.(),
                _this.params.afterAnimateIn?.()));
          })();
        } else
          !(async function destroyFragment() {
            if (!_this.fragment) return;
            _this.params.noAutoAnim || (await _this.fragment.animateOut?.());
            (_this.fragment.destroy(),
              _this.params.afterDestroy?.(),
              (_this.fragment = null),
              (_this.paramsState = null));
          })();
      }
      function getSanitizedParamsKeys() {
        return Array.from(_this.params.map)
          .filter(([key]) => !PARAMS_TO_SANITIZE.includes(key))
          .map(([key]) => key);
      }
      (_this.fragment,
        _this.paramsState,
        (_this.onInit = function () {
          (_this.bind(_this.params, "conditionState", update),
            (function setupParamBindings() {
              for (const key of getSanitizedParamsKeys())
                _this.bindState(_this.params, key, (value) => {
                  _this.paramsState && (_this.paramsState[key] = value);
                });
            })());
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
          "XIf" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }