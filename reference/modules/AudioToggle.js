function AudioToggle(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "AudioToggle"),
      (_this.contexts = "Element"),
      (_this.params = _params),
      (_this.args = arguments),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.initClass(FragUIHelper, {
          clsx: "stack",
          _type: "UI",
          refName: "ui",
          children: [
            {
              className: "container",
              _type: "div",
              refName: "bar1container",
              children: [
                {
                  className: "bar",
                  viewBox: "$viewBox",
                  _type: "svg",
                  refName: "bar1",
                  children: [
                    {
                      d: "M 1 12 L 1 10",
                      _type: "path",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              className: "container",
              _type: "div",
              refName: "bar2container",
              children: [
                {
                  className: "bar",
                  viewBox: "$viewBox",
                  _type: "svg",
                  refName: "bar2",
                  children: [
                    {
                      d: "M 1 12 L 1 10",
                      _type: "path",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              className: "container",
              _type: "div",
              refName: "bar3container",
              children: [
                {
                  className: "bar",
                  viewBox: "$viewBox",
                  _type: "svg",
                  refName: "bar3",
                  children: [
                    {
                      d: "M 1 12 L 1 10",
                      _type: "path",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              className: "container",
              _type: "div",
              refName: "bar4container",
              children: [
                {
                  className: "bar",
                  viewBox: "$viewBox",
                  _type: "svg",
                  refName: "bar4",
                  children: [
                    {
                      d: "M 1 12 L 1 10",
                      _type: "path",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      _this.variant = _this.params.variant || "relative";
      const CONFIG = {
          gap: 3,
          useNoisy: !1,
          bar: { width: 3, baseHeight: 2, maxHeight: 24, noiseDensity: 2 },
        },
        AUDIO_MANAGER = AudioManager.instance(),
        CONTAINERS = [
          _this.bar1container,
          _this.bar2container,
          _this.bar3container,
          _this.bar4container,
        ],
        BARS = [_this.bar1, _this.bar2, _this.bar3, _this.bar4];
      function onHover(e) {}
      function onClick() {
        const shouldMute = !AUDIO_MANAGER.muted;
        AUDIO_MANAGER.mute(shouldMute, { duration: shouldMute ? 50 : 200 });
      }
      function loop() {
        const [frequencies, metadata] = AUDIO_MANAGER.getFrequencies(),
          sampleRate = AUDIO_MANAGER.ctx.sampleRate,
          { bufferLength: bufferLength } = metadata,
          barSizes = AudioUtils.splitFrequencies(frequencies, {
            bufferLength: bufferLength,
            sampleRate: sampleRate,
          }),
          { baseHeight: baseHeight, maxHeight: maxHeight } = CONFIG.bar;
        barSizes.forEach((value, index) => {
          const svg = BARS[index],
            sensitivity =
              AudioConfig.FREQUENCY_BANDS[index].sensitivity * (maxHeight / 2),
            easedValue = (function easeInSine(x) {
              return 1 - Math.cos((x * Math.PI) / 2);
            })(value),
            scale = Math.max(1, easedValue * sensitivity * svg.__scale.value),
            height = baseHeight * scale,
            center = CONFIG.bar.maxHeight / 2,
            startX = CONFIG.bar.width / 2,
            startY = center - height / 2,
            endY = center + height / 2;
          CONFIG.useNoisy
            ? svg.__path.setAttribute(
                "d",
                (function getNoisyPathD(
                  { startX: startX, startY: startY },
                  endY,
                ) {
                  const { noiseDensity: noiseDensity } = CONFIG.bar;
                  let d = `M ${startX} ${startY}`;
                  for (let i = 0; i < noiseDensity + 1; i++) {
                    const progress = i / noiseDensity;
                    let x = 0,
                      y = Math.range(progress, 0, 1, startY, endY);
                    d += `L${startX + x + perlin(x, y)} ${y}`;
                  }
                  return d;
                })({ startX: startX, startY: startY }, endY),
              )
            : svg.__path.setAttribute(
                "d",
                `M ${startX} ${startY} L ${startX} ${endY}`,
              );
        });
      }
      function perlin(x, y) {
        return (
          (x += Render.TIME),
          ((43758.5453 * Math.sin(12.9898 * x + 78.233 * y)) % 1) * 0.8
        );
      }
      ((_this.viewBox = `0 0 ${CONFIG.bar.width} ${CONFIG.bar.maxHeight}`),
        _this.set("hover", !1),
        (_this.onInit = async function () {
          (_this.element.attr("data-variant", _this.variant),
            _this.element.div.style.setProperty(
              "--size",
              `${CONFIG.bar.width}px`,
            ),
            _this.element.div.style.setProperty(
              "--max-height",
              `${CONFIG.bar.maxHeight}px`,
            ),
            _this.element.div.style.setProperty("--gap", `${CONFIG.gap}px`),
            _this.element.div.style.setProperty(
              "--bar-size",
              `${CONFIG.bar.width}px`,
            ),
            await _this.animateSet(),
            _this.listen("Global/loaderFinished", () => _this.animateIn()),
            _this.element.interact({
              clickCallback: onClick,
              hoverCallback: onHover,
              seoLink: "",
              seoText: "Toggle audio",
            }),
            _this.startRender(loop, 24));
        }),
        (_this.animateSet = async function () {
          await _this.wait(() => _this.element.div.clientWidth);
          for (const svg of BARS)
            (svg.css({ opacity: 0 }),
              (svg.__scale = { value: 1 }),
              (svg.__path = svg.div.querySelector("path")));
          for (const container of CONTAINERS)
            container.transform({ x: _this.element.div.clientWidth });
        }),
        (_this.animateIn = async function () {
          function getTimings(index) {
            return {
              duration: 500 + 20 * index,
              delay: 20 * (BARS.length - index),
            };
          }
          const containers = CONTAINERS.map((container, index) => {
              const position = index * (CONFIG.gap + CONFIG.bar.width),
                { duration: duration, delay: delay } = getTimings(index);
              return container
                .tween({ x: position }, duration, "easeOutCubic", delay)
                .promise();
            }),
            bars = BARS.map((bar, index) => {
              const { duration: duration, delay: delay } = getTimings(index);
              return bar
                .tween({ opacity: 1 }, duration, "easeOutCubic", delay)
                .promise();
            });
          await Promise.all([...containers, ...bars]);
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
          "AudioToggle" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }