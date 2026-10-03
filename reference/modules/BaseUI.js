function BaseUI(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "BaseUI"),
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
      function loop() {
        Global.SCROLL &&
          Global.CAMERA &&
          (function checkInViewByScrollPercent(scroll) {
            const triggerInView = () => {
                _this.flag("inView") ||
                  (_this.flag("inBelowTrigger") ||
                    (GoogleAnalytics.track(
                      `in_view_${_this.fragName.replace("UI", "").toLowerCase()}`,
                    ),
                    _this.onInView?.(),
                    _this.parent.onInView?.(),
                    !_this.isContinuous && _this.flag("inBelowTrigger", !0)),
                  _this.flag("inView", !0),
                  _this.flag("outView") && _this.flag("outView", !1));
              },
              triggerOutAbove = () => {
                _this.flag("inView") &&
                  (_this.flag("outAboveTrigger") ||
                    (_this.onOutView?.(),
                    _this.parent.onOutView?.(),
                    !_this.isContinuous && _this.flag("outAboveTrigger", !0)),
                  _this.flag("inView", !1));
              },
              triggerOutBelow = () => {
                _this.flag("outView") ||
                  (_this.flag("outBelowTrigger") ||
                    (_this.onOutView?.(),
                    _this.parent.onOutView?.(),
                    !_this.isContinuous && _this.flag("outBelowTrigger", !0)),
                  _this.flag("outView", !0),
                  _this.flag("inView") && _this.flag("inView", !1));
              };
            scroll.y >= _this.scrollStart &&
              scroll.y <= _this.scrollEnd &&
              triggerInView();
            scroll.y < _this.scrollStart && triggerOutAbove();
            scroll.y > _this.scrollEnd + 1 &&
              (_this.flag("inBelowTrigger") || triggerInView(),
              triggerOutBelow());
          })(Global.SCROLL);
      }
      function computeScrollBounds() {
        if (!Global.SCROLL) return;
        let rect = _this.element.div.getBoundingClientRect();
        if (0 === rect.width && 0 === rect.height) return;
        if (!rect) return;
        const top = rect.top + Global.SCROLL.y - Stage.height,
          bottom = rect.top + Global.SCROLL.y + rect.height - Stage.height;
        ((_this.scrollStart = top + _this.scrollTriggerOffsetIn * rect.height),
          (_this.scrollEnd =
            bottom + _this.scrollTriggerOffsetOut * rect.height));
      }
      ((_this.AUDIO_MANAGER = AudioManager.instance()),
        (_this.log = (...message) => {
          console.log(`[${_this.fragName}]`, ...message);
        }),
        (_this.onInit = async () => {
          (await defer(),
            (_this.scrollTriggerOffsetIn = _this.scrollTriggerOffsetIn || 0),
            (_this.scrollTriggerOffsetOut = _this.scrollTriggerOffsetOut || 0),
            (_this.isContinuous = _this.isContinuous || !1),
            _this.flag("initialized") ||
              (_this.flag("initialized", !0),
              _this.useScrollTrigger &&
                (computeScrollBounds(), _this.startRender(loop)),
              Global.PLAYGROUND && _this.animateIn?.()));
        }),
        (_this.resetFlags = (_) => {
          (_this.flag("inView", !1), (_this.prevScrollY = null));
        }),
        (_this.computeScrollBounds = () => {
          computeScrollBounds();
        }),
        (_this.handleUIResize = () => {
          (computeScrollBounds(), _this.handleResize?.());
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
          "BaseUI" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }