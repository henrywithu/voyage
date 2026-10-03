function VOManager() {
    const _this = this;
    (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "VOManager"),
      (_this.contexts = "Component"),
      (this.isFragment = !0));
    var _promises = [];
    !(async function () {
      (_this.element &&
        (_this.element.onMountedHook = (_) => _this.onMounted?.()),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      const QUEUE_STATE = {
        notInQueue: 0,
        queued: 1,
        playing: 2,
        fadingOut: 3,
      };
      _this.data = get("assets/data/vo/all_timestamps.json");
      const queue = {};
      for (const id of Object.keys(_this.data))
        queue[id] = QUEUE_STATE.notInQueue;
      let _playing = null,
        _fadingOutPlaying = null,
        _lastActivityTime = Date.now();
      const IDLE_DELAY_MS = 100,
        SCROLL_THRESHOLD = 0.6;
      function isIdle() {
        return Date.now() - _lastActivityTime >= IDLE_DELAY_MS;
      }
      function playNext() {
        const next = Object.entries(queue).find(
          ([_, state]) => state === QUEUE_STATE.queued,
        )?.[0];
        if (!next) return;
        ((_playing = next),
          (queue[_playing] = QUEUE_STATE.playing),
          log("[VO] - playing", _playing));
        const trackId = getTrackId(_playing);
        AudioUtils.playOneShot(trackId, { noTween: !0, startFrom: 0 });
        getTextBox(_playing).startVoAnimation(_this.data[_playing]);
        AudioManager.instance()
          .getAudio(trackId)
          .events.sub(AudioNode.AUDIO_COMPLETE, onAudioFinish);
      }
      function onAudioFinish({ id: trackId }) {
        if (!trackId.includes("vo")) return;
        const id = trackId.split("-")[1];
        if (id != _playing) return;
        ((_playing = null), (queue[id] = QUEUE_STATE.notInQueue));
        getTextBox(id).stopVoAnimation();
        AudioManager.instance()
          .getAudio(trackId)
          .events.unsub(AudioNode.AUDIO_COMPLETE, onAudioFinish);
      }
      function getTrackId(id) {
        return `vo-${id}`;
      }
      function log(...args) {
        Utils.query("debugVo") && console.log(...args);
      }
      function getTextBox(id) {
        const frag = Object.values(Global.ALL_TEXTS).find(
          (item) => item.id == id,
        )?.frag;
        if (!frag) throw new Error(`No text box registered for VO entry ${id}`);
        return frag;
      }
      (_this.startRender(function loop() {
        if (!Global.SCROLL || Config.NO_VO) return;
        if (
          ((function updateIdleTracking() {
            const deltaY = Global.SCROLL.delta.y;
            Math.abs(deltaY) > SCROLL_THRESHOLD &&
              (_lastActivityTime = Date.now());
          })(),
          !isIdle() || _playing)
        )
          return;
        if (!Object.values(queue).includes(QUEUE_STATE.queued)) return;
        playNext();
      }),
        _this.set("loaded", !0),
        (_this.addToQueue = function (id) {
          (log("[VO] - Added", id), (queue[id] = QUEUE_STATE.queued));
        }),
        (_this.reset = async function (delay = 0) {
          if (_playing) {
            const trackId = getTrackId(_playing);
            (AudioManager.instance().setVolume(trackId, 0, { smoothing: 0.05 }),
              onAudioFinish({ id: trackId }));
          }
          for (const id of Object.keys(queue))
            queue[id] = QUEUE_STATE.notInQueue;
          (await _this.wait(delay), _this.fire("VOManager/reset"));
        }),
        (_this.removeFromQueue = function (id) {
          queue[id] !== QUEUE_STATE.queued
            ? queue[id] === QUEUE_STATE.playing &&
              (function fadeOutPlaying() {
                const audioManager = AudioManager.instance(),
                  target = _playing;
                if (!target)
                  return void console.warn(
                    "[VO}: Tried to fade out with no _playing track",
                  );
                const trackId = getTrackId(target);
                if (!audioManager.getAudio(trackId)) return;
                ((queue[target] = QUEUE_STATE.fadingOut),
                  log("[VO] exiting", target),
                  audioManager.setVolume(trackId, 0, { smoothing: 0.15 }),
                  (_fadingOutPlaying = !0),
                  _this.delayedCall(() => {
                    ((_fadingOutPlaying = !1),
                      (queue[target] = QUEUE_STATE.notInQueue));
                    AudioManager.instance()
                      .getAudio(trackId)
                      .events.unsub(AudioNode.AUDIO_COMPLETE, onAudioFinish);
                    (getTextBox(target).stopVoAnimation(),
                      _playing === target && isIdle()
                        ? ((_playing = null), playNext())
                        : (_playing = null));
                  }, 400));
              })()
            : (queue[id] = QUEUE_STATE.notInQueue);
        }),
        _this.fn("registerAudio", () => {
          const AUDIO_MANAGER = AudioManager.instance();
          for (const id of Object.keys(_this.data)) {
            const asset = Assets.getPath(`assets/audio/vo/${id}.mp3`);
            AUDIO_MANAGER.registerAudio(getTrackId(id), asset, null, {
              baseGain: 1.25,
            });
          }
        }),
        Dev.expose("copyGlobalText", () => {
          const texts = (function getGlobalText() {
            const texts = Object.entries(Global.ALL_TEXTS).reduce(
              (acc, [key, item]) => (
                (acc[key] = { id: item.id, text: item.text }),
                acc
              ),
              {},
            );
            return texts;
          })();
          (console.log(texts), navigator.clipboard.writeText(texts));
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
          "VOManager" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }