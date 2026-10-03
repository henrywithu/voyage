function GazeCamera(_input, _group) {
    Inherit(this, BaseCamera);
    const _this = this;
    var _strength = { v: 1 },
      _cacheObj = {},
      _move = new Vector3(),
      _position = new Vector3(),
      _wobble = new Vector3(),
      _rotation = 0,
      _wobbleAngle = Math.radians(Math.rand(0, 360)),
      _innerGroup = new Group(),
      _viewportFocusOffset = new Vector3(),
      _hasViewportFocusOffset = !1,
      _quaternion = new Quaternion(),
      _useCustomMove = !1,
      _prevMoveX = 0;
    const V3_ZERO = new Vector3(0);
    ((this.strength = 1),
      (this.moveXY = new Vector2(4, 4)),
      (this.position = new (function Position() {
        Inherit(this, Component);
        var _x = 0,
          _y = 0,
          _z = 0;
        (this.get("x", (_) => _x),
          this.get("y", (_) => _y),
          this.get("z", (_) => _z),
          this.set("x", (x) => {
            _x = x;
          }),
          this.set("y", (y) => {
            _y = y;
          }),
          this.set("z", (z) => {
            ((_z = z),
              (_move.z = _z),
              _this.camera.position.copy(_move),
              _position.copy(_move));
          }),
          (this.set = function (x, y, z, noCopy) {
            ((_x = x),
              (_y = y),
              (_z = z),
              (_move.z = z),
              noCopy || _this.camera.position.copy(_move),
              _position.copy(_move));
          }),
          (this.toArray = function () {
            return [_x, _y, _z];
          }),
          (this.fromArray = function (array) {
            ((_x = array[0]),
              (_y = array[1]),
              (_z = array[2]),
              _move.set(_x, _y, _z),
              _this.camera.position.copy(_move),
              _position.copy(_move));
          }),
          (this.copy = function (vec) {
            ((_x = vec.x),
              (_y = vec.y),
              (_z = vec.z),
              _move.set(_x, _y, _z),
              _this.camera.position.copy(_move),
              _position.copy(_move));
          }));
      })()),
      (this.lerpSpeed = 0.05),
      (this.lerpSpeed2 = 1),
      (this.lookAt = new Vector3(0, 0, 0)),
      (this.cameraRotation = new Euler()),
      (this.viewportFocus = new Vector2(0, 0)),
      (this.deltaRotate = 0),
      (this.deltaLerp = 1),
      (this.wobbleSpeed = 1),
      (this.wobbleStrength = 0),
      (this.wobbleZ = 1),
      (this.zoomOffset = 0),
      (function () {
        if (_input) {
          _this.prefix = _input.prefix;
          let cameraUIL = CameraUIL.add(_this, _group);
          (cameraUIL.setLabel("Camera"), (_this.group._cameraUIL = cameraUIL));
        }
        (_innerGroup.add(_this.camera), _this.group.add(_innerGroup));
      })(),
      (this.orbit = function (time = 1e3, ease = "easeInOutSine") {
        return tween(_strength, { v: 1 }, time, ease);
      }),
      (this.still = function (time = 300, ease = "easeInOutSine") {
        return tween(_strength, { v: 0 }, time, ease);
      }));
    var _v1 = new Vector3(),
      _v2 = new Vector3(),
      _v3 = new Vector3();
    ((this.move = function (vec) {
      let moveDiff = _v1.subVectors(_move, _this.position),
        positionDiff = _v2.subVectors(_move, _position),
        cameraPosDiff = _v3.subVectors(_this.camera.position, _position);
      (_this.position.set(vec.x, vec.y, vec.z, !0),
        _move.copy(vec).add(moveDiff),
        _position.copy(_move).add(positionDiff),
        _this.camera.position.copy(_position).add(cameraPosDiff));
    }),
      this.get("useCustomMove", () => _useCustomMove),
      this.set("useCustomMove", (value) => {
        value
          ? ((_useCustomMove = !0),
            _this.customMove || (_this.customMove = new Vector2()))
          : (_useCustomMove = !1);
      }),
      (this._loop = function loop() {
        _hasViewportFocusOffset &&
          _this.camera.position.sub(_viewportFocusOffset);
        let moveX = 0,
          moveY = 0;
        (_useCustomMove
          ? ((moveX = Math.clamp(_this.customMove.x, -1, 1)),
            (moveY = Math.clamp(_this.customMove.y, -1, 1)))
          : _this.useAccelerometer &&
              Mobile.Accelerometer &&
              Mobile.Accelerometer.connected
            ? ((moveX = Math.range(Mobile.Accelerometer.x, -2, 2, -1, 1, !0)),
              (moveY = 0))
            : ((moveX =
                Stage.width && Math.range(Mouse.x, 0, Stage.width, -1, 1, !0)),
              (moveY =
                Stage.height &&
                Math.range(Mouse.y, 0, Stage.height, -1, 1, !0))),
          (_move.x =
            _this.position.x +
            moveX * _strength.v * _this.moveXY.x * _this.strength),
          (_move.y =
            _this.position.y +
            moveY * _strength.v * _this.moveXY.y * _this.strength));
        let deltaX = moveX - _prevMoveX;
        _prevMoveX = moveX;
        let rotateStrength =
          Stage.width &&
          Math.range(Math.abs(deltaX) / Stage.width, 0, 0.02, 0, 1, !0);
        if (
          ((_rotation = Math.lerp(
            Math.radians(_this.deltaRotate) *
              rotateStrength *
              Math.sign(deltaX),
            _rotation,
            0.02 * _this.deltaLerp * _strength.v,
          )),
          (_innerGroup.rotation.z = Math.lerp(
            _rotation,
            _innerGroup.rotation.z,
            0.07 * _this.deltaLerp,
          )),
          (_move.z = _this.position.z),
          _position.lerp(_move, _this.lerpSpeed2),
          (_position.z += _this.zoomOffset),
          _this.camera.position.lerp(_position, _this.lerpSpeed),
          _this.camera.lookAt(_this.lookAt),
          (Math.abs(_this.cameraRotation.x) > Base3D.DIRTY_EPSILON ||
            Math.abs(_this.cameraRotation.y) > Base3D.DIRTY_EPSILON ||
            Math.abs(_this.cameraRotation.z) > Base3D.DIRTY_EPSILON) &&
            (_quaternion.setFromEuler(_this.cameraRotation),
            _this.camera.quaternion.multiply(_quaternion)),
          (function focusViewport() {
            let nextHasViewportFocusOffset =
              Math.abs(_this.viewportFocus.x) > 1e-4 ||
              Math.abs(_this.viewportFocus.y) > 1e-4;
            nextHasViewportFocusOffset !== _hasViewportFocusOffset &&
              (nextHasViewportFocusOffset || _viewportFocusOffset.setScalar(0),
              (_hasViewportFocusOffset = nextHasViewportFocusOffset));
            if (!_hasViewportFocusOffset) return;
            let localCamera = _cacheObj,
              camera = _this.camera;
            camera.matrixDirty && camera.updateMatrix();
            ((localCamera.matrixWorld = camera.matrix),
              (localCamera.projectionMatrix = camera.projectionMatrix),
              _viewportFocusOffset.copy(_this.lookAt).project(localCamera),
              isFinite(_viewportFocusOffset.x) ||
                _viewportFocusOffset.set(0, 0, 0));
            ((_viewportFocusOffset.x -= _this.viewportFocus.x),
              (_viewportFocusOffset.y -= _this.viewportFocus.y),
              _viewportFocusOffset.unproject(localCamera),
              _viewportFocusOffset.sub(_this.lookAt),
              _this.camera.position.add(_viewportFocusOffset));
          })(),
          _this.wobbleStrength > 0)
        ) {
          let t = Render.TIME;
          ((_wobble.x =
            Math.cos(_wobbleAngle + t * (75e-5 * _this.wobbleSpeed)) *
            (_wobbleAngle + 200 * Math.sin(t * (95e-5 * _this.wobbleSpeed)))),
            (_wobble.y =
              Math.sin(
                Math.asin(
                  Math.cos(_wobbleAngle + t * (85e-5 * _this.wobbleSpeed)),
                ),
              ) *
              (150 * Math.sin(_wobbleAngle + t * (75e-5 * _this.wobbleSpeed)))),
            (_wobble.x *=
              2 * Math.sin(_wobbleAngle + t * (75e-5 * _this.wobbleSpeed))),
            (_wobble.y *=
              1.75 * Math.cos(_wobbleAngle + t * (65e-5 * _this.wobbleSpeed))),
            (_wobble.x *=
              1.1 * Math.cos(_wobbleAngle + t * (75e-5 * _this.wobbleSpeed))),
            (_wobble.y *=
              1.15 * Math.sin(_wobbleAngle + t * (25e-5 * _this.wobbleSpeed))),
            (_wobble.z =
              Math.sin(_wobbleAngle + 0.0025 * _wobble.x) *
              (100 * _this.wobbleZ)),
            _wobble.multiplyScalar(0.001 * _this.wobbleStrength * _strength.v),
            _innerGroup.position.lerp(_wobble, 0.07),
            _this.flag("hasWobble", !0));
        } else
          _this.flag("hasWobble") &&
            (_innerGroup.position.lerp(V3_ZERO, 0.07),
            _innerGroup.position.length() < 0.001 &&
              (_innerGroup.position.set(0, 0, 0), _this.flag("hasWobble", !1)));
      }));
  }