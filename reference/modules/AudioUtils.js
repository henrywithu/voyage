function AudioUtils() {
    const _this = this;
    (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "AudioUtils"),
      (_this.contexts = "Component"),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      function hzToFrequencyBinIndex(
        hz,
        { bufferLength: bufferLength, sampleRate: sampleRate },
      ) {
        return Math.floor((hz * bufferLength) / (sampleRate / 2));
      }
      ((_this.getMixForScene = function (
        progress,
        { boundStart: boundStart, boundEnd: boundEnd } = {
          boundStart: 0,
          boundEnd: 1,
        },
      ) {
        if (boundEnd <= boundStart)
          throw new Error(
            "Bounds are defined in 0-1 scene height range. End cannot be same or lesser than start.",
          );
        return Math.range(progress, boundStart, boundEnd, 0, 1, !1);
      }),
        (_this.startLoop = function (
          id,
          { volume: volume = 0, ...options } = {},
        ) {
          const fullOptions = {
            volume: volume,
            noTween: !0,
            ...AudioConfig.TRACKS[id],
            ...options,
          };
          (fullOptions.baseGain &&
            fullOptions.volume &&
            (fullOptions.volume *= fullOptions.baseGain),
            AudioManager.instance().play(id, fullOptions));
        }),
        (_this.playOneShot = function (id, options) {
          const fullOptions = {
            loop: !1,
            playOnce: !0,
            ...AudioConfig.TRACKS[id],
            ...options,
          };
          AudioManager.instance().play(id, fullOptions);
        }),
        (_this.playRoundRobin = function (id, options) {
          const fullOptions = {
            loop: !1,
            playOnce: !0,
            ...AudioConfig.TRACKS[id],
            ...options,
          };
          AudioManager.instance().play(
            `${id}_${_this.getRoundRobinIndex(id)}`,
            fullOptions,
          );
        }),
        (_this.playClick = function () {
          _this.playOneShot("ui_click");
        }),
        (_this.splitFrequencies = function (frequencies, metadata) {
          const result = [];
          for (
            let index = 0;
            index < AudioConfig.FREQUENCY_BANDS.length;
            index++
          ) {
            const { min: min, max: max } = AudioConfig.FREQUENCY_BANDS[index],
              minIndex = hzToFrequencyBinIndex(min, metadata),
              maxIndex = hzToFrequencyBinIndex(max, metadata),
              average =
                frequencies
                  .slice(minIndex, maxIndex)
                  .reduce((total, value) => total + value, 0) /
                (maxIndex - minIndex) /
                255;
            Number.isNaN(average)
              ? ((result[index] = 0),
                console.warn(
                  "Frequency has been calculated as NaN. Check defined frequency bands.",
                ))
              : (result[index] = average);
          }
          return result;
        }));
      const ROUND_ROBIN_TRACKER = {};
      ((_this.setupRoundRobin = function (key, count) {
        ROUND_ROBIN_TRACKER[key] = { count: count, value: 1 };
      }),
        (_this.getRoundRobinIndex = function (key) {
          const entry = ROUND_ROBIN_TRACKER[key];
          if (!entry)
            throw new Error(`Round robin has not been set up for ${key}`);
          const result = entry.value;
          return (
            (entry.value = ((entry.value + 1) % entry.count) + 1),
            result
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
          "AudioUtils" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }