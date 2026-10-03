function SceneUtils() {
    const _this = this;
    (Inherit(_this, XComponent),
      (_this.fragName = "SceneUtils"),
      (_this.contexts = ""),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      function getDOMBounds(element) {
        const bounds = element.getBoundingClientRect();
        return {
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height,
        };
      }
      _this.domToWebGL = function ({
        element: element,
        camera: camera,
        dist: dist,
        offsetY: offsetY = 0,
        offsetZ: offsetZ = 0,
      }) {
        const bounds = getDOMBounds(element);
        const position = (function getProjectedPosition(x, y, camera, dist) {
            let viewportHeight = Utils3D.getHeightFromCamera(camera, dist),
              viewportWidth = viewportHeight * camera.aspect;
            return {
              x: (x / Stage.width - 0.5) * viewportWidth,
              y: (1 - y / Stage.height - 0.5) * viewportHeight,
            };
          })(
            bounds.left + bounds.width / 2,
            bounds.top - offsetY + bounds.height / 2,
            camera,
            dist,
          ),
          scale = (function getScale(element, camera, dist) {
            let sizeX,
              sizeY,
              viewportHeight = Utils3D.getHeightFromCamera(camera, dist),
              viewportWidth = viewportHeight * camera.aspect;
            const bounds = getDOMBounds(element);
            return (
              (sizeX = (bounds.width / Stage.width) * viewportWidth),
              (sizeY = (bounds.height / Stage.height) * viewportHeight),
              new Vector3(sizeX, sizeY, sizeY)
            );
          })(element, camera, dist);
        return { position: position, scale: scale, offsetZ: offsetZ };
      };
      const worldPosition = new Vector3(),
        screenPosition = new Vector2();
      ((_this.webGLToDOM = function (object, camera, parent) {
        (object.getWorldPosition(worldPosition),
          parent &&
            (parent.updateMatrixWorld(!0),
            worldPosition.applyMatrix4(parent.matrixWorld)));
        const projected = worldPosition.project(camera),
          screenX = (0.5 * projected.x + 0.5) * Stage.width,
          screenY = (1 - (0.5 * projected.y + 0.5)) * Stage.height;
        return (
          (screenPosition.x = screenX),
          (screenPosition.y = screenY),
          screenPosition.clone()
        );
      }),
        (_this.getUnitsPerPixelY = function getUnitsPerPixelY(
          cameraFovDeg,
          cameraZ,
          screenHeight,
        ) {
          const fovRad = (cameraFovDeg * Math.PI) / 180;
          return (
            (2 * (Math.tan(fovRad / 2) * Math.abs(cameraZ))) / screenHeight
          );
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
          "SceneUtils" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }