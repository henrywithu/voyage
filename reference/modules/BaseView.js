function BaseView(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Frag3D, _params),
      Inherit(_this, SceneUtils),
      Inherit(_this, XComponent),
      (_this.fragName = "BaseView"),
      (_this.contexts = "Frag3D, _params,SceneUtils"),
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
      ((_this.AUDIO_MANAGER = AudioManager.instance()),
        (_this.log = (...message) => {
          console.log(`[${_this.fragName}]`, ...message);
        }),
        (_this.heightWorld = 0),
        _this.isPlayground(_this.fragName) && (_this.baseHeight = 1),
        (_this.onInit = async () => {
          if ((await defer(), _this.flag("initialized"))) return;
          _this.flag("initialized", !0);
          const uiName = _this.fragName.replace("Scene", "UI"),
            uiClass = window[uiName];
          if (uiClass && !Utils.query("skipUI")) {
            const root = _this.isPlayground(_this.fragName)
              ? Stage
              : _this.parent.storyRoot;
            ((_this.ui = _this.createFragment(uiClass, [root])),
              _this.isPlayground(_this.fragName) &&
                _this.ui.element.css({
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  minHeight: "100dvh",
                  height: "auto",
                  zIndex: 9999,
                  paddingTop: 0,
                  paddingBottom: 0,
                }));
          }
          (_this.flag("isReady", !0),
            _this.isPlayground() && _this.init?.(),
            await defer(),
            (_this.parentCamera = _this.parent.camera),
            await Promise.race([
              _this.wait(() => !!_this.parentCamera),
              _this.wait(4e3),
            ]),
            _this.applyTilt());
        }),
        (_this.onready = async () => {
          (await _this.init?.(), _this.preload?.());
        }),
        (_this.toggleVisibility = ({
          lerpedScrollY: lerpedScrollY,
          screenHeightWorld: screenHeightWorld,
          visibilityPaddingTop: visibilityPaddingTop,
          visibilityPaddingBottom: visibilityPaddingBottom,
        }) => {
          const marginTopWorld = _this.marginTopWorld || 0,
            visible =
              -lerpedScrollY + screenHeightWorld + visibilityPaddingBottom >
                _this.worldBottom &&
              -lerpedScrollY - visibilityPaddingTop < _this.worldTop;
          ((_this.scrollProgress = Math.range(
            -lerpedScrollY,
            _this.worldBottom -
              screenHeightWorld -
              visibilityPaddingBottom +
              marginTopWorld,
            _this.worldTop + visibilityPaddingTop,
            0,
            1,
          )),
            (_this.visible = visible),
            _this.onVisibilityChange?.(visible));
        }),
        (_this.scrollUI = ({ scrollY: scrollY }) => {
          _this.ui &&
            ((_this.ui.element.y = scrollY),
            _this.ui.element.transform(),
            _this.afterScroll?.(scrollY));
        }),
        (_this.setLayout = async ({
          screenHeightWorld: screenHeightWorld,
          height: height,
          totalHeight: totalHeight,
          marginTop: marginTop,
          marginBottom: marginBottom,
        }) => {
          (await _this.wait("isReady"),
            (_this.marginTop = marginTop || 0),
            (_this.marginBottom = marginBottom || 0),
            (_this.marginTopWorld = _this.marginTop * screenHeightWorld),
            (_this.marginBottomWorld = _this.marginBottom * screenHeightWorld),
            (function layoutUI({
              height: height,
              marginTop: marginTop = 0,
              marginBottom: marginBottom = 0,
            }) {
              if (
                (_this.ui?.element.css({ order: _this.params.order }),
                "auto" === height)
              )
                return void _this.ui.element.div.style.setProperty(
                  "height",
                  "auto",
                  "important",
                );
              if (!_this.ui)
                return void console.warn(
                  "No UI found for scene",
                  _this.fragName,
                );
              (_this.ui.element.div.style.setProperty(
                "--height",
                Stage.height * height + "px",
              ),
                _this.ui.element.div.style.setProperty(
                  "--margin-top",
                  Stage.height * marginTop + "px",
                ),
                _this.ui.element.div.style.setProperty(
                  "--margin-bottom",
                  Stage.height * marginBottom + "px",
                ));
            })({
              height: height,
              marginTop: marginTop,
              marginBottom: marginBottom,
            }),
            (function layout3D({
              screenHeightWorld: screenHeightWorld,
              height: height,
              totalHeight: totalHeight,
            }) {
              "auto" === height &&
                (height = _this.ui.element.div.clientHeight / Stage.height);
              ((_this.baseHeight = height),
                (_this.heightWorld = height * screenHeightWorld),
                (_this.group.position.y = 0.5 * screenHeightWorld),
                (_this.group.position.y -= totalHeight),
                (_this.group.position.y -= 0.5 * _this.heightWorld),
                (_this.worldBottom = totalHeight),
                (_this.worldMiddle = totalHeight + 0.5 * _this.heightWorld),
                (_this.worldTop = totalHeight + _this.heightWorld),
                (_this.worldTopPx = _this.worldTop / Global.UNITS_PER_PIXEL_Y),
                (_this.worldBottomPx =
                  _this.worldBottom / Global.UNITS_PER_PIXEL_Y),
                (_this.worldMiddlePx =
                  _this.worldMiddle / Global.UNITS_PER_PIXEL_Y));
            })({
              screenHeightWorld: screenHeightWorld,
              height: height,
              totalHeight: totalHeight,
            }));
        }),
        (_this.tiltItems = []),
        (_this.applyTilt = function () {
          if (!Tests.domTilt()) return;
          if (_this.NO_TILT) return;
          if (!_this.ui) return;
          let els = [..._this.ui.element.div.querySelectorAll("[data-tilt]")];
          if (0 === els.length) return;
          (console.log(
            "applyTilt",
            _this.ui.element.div.querySelectorAll("[data-tilt]"),
          ),
            (els = els.map((el) => _this.h(el))),
            (_this.tiltItems = els),
            _this.ui.element.css({ perspective: 1e3 }));
          const _t = new Vector2(),
            _tilt = new Vector2(),
            _translate = new Vector2(),
            _tiltSettings = new Vector2(20, 5),
            _translateSettings = new Vector2(80, 20);
          ((_tiltSettings.x *= -1),
            (_translateSettings.x *= -1),
            _this.startRender(() => {
              if (_this.isResizing || !_this.parentCamera) return;
              (_t.copy(_this.parentCamera.camera.position),
                _tilt
                  .copy(_t)
                  .add(_this.parentCamera.lookAt)
                  .multiply(_tiltSettings)
                  .multiplyScalar(0.5),
                _translate
                  .copy(_t)
                  .multiply(_translateSettings)
                  .multiplyScalar(0.5),
                els.forEach((el) => {
                  ((el.x = _translate.x),
                    (el.y = _translate.y),
                    (el.rotationX = -1 * _tilt.y),
                    (el.rotationY = _tilt.x),
                    el.transform());
                }));
            }, RenderManager.BEFORE_RENDER));
        }),
        (_this.preload = async (_) => {
          (Global.loader.add(1),
            await Initializer3D.uploadAll(_this.group),
            await Initializer3D.uploadAll(_this.layout),
            Global.loader.trigger(1));
        }),
        (_this.handleViewResize = async (override = !1) => {
          (_this.tiltItems.forEach((el) => {
            ((el.x = 0),
              (el.y = 0),
              (el.z = 0),
              (el.rotationX = 0),
              (el.rotationY = 0),
              el.transform());
          }),
            await _this.ui?.handleUIResize?.(),
            await _this.handleResize?.(),
            (_this.isResizing = !1));
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
          "BaseView" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }