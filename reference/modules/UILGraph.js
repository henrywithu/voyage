function UILGraph(_params, ...restArgs) {
      const _this = this;
      (Inherit(_this, Element),
        Inherit(_this, XComponent),
        (_this.fragName = "UILGraph"),
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
                _type: "div",
                refName: "wrapper",
                children: [
                  {
                    addTo: "$body",
                    _type: "UILGraphContextMenu",
                    refName: "contextMenu",
                    children: [],
                  },
                ],
              },
            ],
          }),
          _this.layout?.getAllLayers &&
            (_this.layers = await _this.layout.getAllLayers()));
        let onInit = _this.onInit;
        _this.body = __body;
        let _uniq = 0;
        var _layouts = {};
        (UIL.sidebar &&
          UIL.sidebar.toolbar &&
          UIL.sidebar.toolbar.element.hide(),
          (_this.onMounted = async function () {
            await _this.wait(1e3);
            const { x: x, y: y } = _this.element.div.getBoundingClientRect();
            _this.contextMenu.setOffset({ x: x, y: y });
          }),
          (_this.add = function (_layout) {
            _layouts[_layout.id] ||
              ((_layouts[_layout.id] = _layout), _this.element.add(_layout));
          }),
          (_this.getGraph = function (name, layoutInstance, isGL = !0) {
            if (!UIL.sidebar) return;
            let _graph = new UILGraphLayout({
              name: name,
              layoutInstance: layoutInstance,
              isGL: isGL,
              uniq: _uniq++,
            });
            return (_this.add(_graph), _graph);
          }),
          _this.element.goob(
            "\n    position:relative;\n    width: 100%;\n    height: auto;\n    user-select: none;\n    margin-bottom: 4px;\n    border-radius: 4px;\n    background-color: #161616;\n\n",
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
            "UILGraph" !== _this.fragName ||
            !_this.onInit ||
            _this.onInit.calledInit ||
            (onInit = _this.onInit),
          onInit &&
            (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
      })();
    }