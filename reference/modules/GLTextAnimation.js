function GLTextAnimation(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Component),
      Inherit(_this, XComponent),
      (_this.fragName = "GLTextAnimation"),
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
      _this.animations = [];
      const ready = Promise.create();
      function calculateItemDelay(index, count, settings) {
        return settings.stagger
          ? settings.stagger * index
          : settings.modulo && index % settings.modulo.value == 0
            ? settings.modulo.stagger
            : settings.randomize
              ? Math.random() * (count - 1) * settings.randomize.stagger
              : 0;
      }
      function createItemTween(
        tweenObj,
        texture,
        index,
        settings,
        delay,
        reverse = !1,
      ) {
        const tw = tween(
          tweenObj,
          { value: reverse ? 1 : 0 },
          settings.duration,
          settings.ease,
          delay,
        ).onUpdate(() => {
          texture?.data?.[index] &&
            ((texture.data[index] = tweenObj.value),
            (texture.needsUpdate = !0));
        });
        return ((tw._obj = tweenObj), tw);
      }
      function getCount(animateBy) {
        return "chars" === animateBy
          ? _this.glText.geometry.letterCount
          : "words" === animateBy
            ? _this.glText.geometry.wordCount
            : "lines" === animateBy
              ? _this.glText.geometry.lineCount
              : void 0;
      }
      ((_this.onInit = () => {
        const { glText: glText } = _this.params;
        ((_this.glText = glText),
          _this.wait(_this.glText.text, "loaded").then(async (_) => {
            ((_this.shader = _this.glText.mesh.shader),
              _this.shader.addUniforms({
                uCount: { value: new Vector3(0, 0, 0) },
              }),
              _this.glText.onResize(async () => {
                (await ready, _this.updateCount());
              }),
              ready.resolve());
          }));
      }),
        (_this.add = async (name, settings) => {
          await ready;
          const { animateBy: animateBy } = settings,
            count = getCount(animateBy),
            texture = new DataTexture(
              new Float32Array(count).fill(1),
              count,
              1,
              Texture.RFormat,
            );
          ((texture.destroyDataAfterUpload = !1), texture.upload());
          const animation = {
            name: name,
            settings: settings,
            count: count,
            texture: texture,
            animateBy: animateBy,
          };
          (_this.animations.push(animation), _this.shader.set(name, texture));
        }),
        (_this.play = async (
          animation,
          reverse = !1,
          { calculateItemDelayOverride: calculateItemDelayOverride } = {},
        ) => {
          await ready;
          const anim = _this.animations.find((a) => a.name === animation);
          if (!anim)
            return void console.warn(`Animation ${animation} not found.`);
          const { settings: settings, count: count, texture: texture } = anim,
            startValue = reverse ? 0 : 1;
          (texture.data.fill(startValue),
            (texture.needsUpdate = !0),
            (function cleanupExistingTweens(anim) {
              anim.tweens &&
                (anim.tweens.forEach((tween) => {
                  tween.stop();
                }),
                (anim.tweens = []));
            })(anim));
          const tweens = [];
          for (let i = 0; i < count; i++) {
            const itemDelay = (
                calculateItemDelayOverride ?? calculateItemDelay
              )(i, count, settings),
              tw = createItemTween(
                { value: reverse ? 0 : 1 },
                texture,
                i,
                settings,
                settings.delay + itemDelay,
                reverse,
              );
            tweens.push(tw);
          }
          anim.tweens = tweens;
        }),
        (_this.reverse = async (animation) => {
          (await ready, _this.play(animation, !0));
        }),
        (_this.pause = async (animation) => {
          await ready;
          const anim = _this.animations.find((a) => a.name === animation);
          anim &&
            anim.tweens.forEach((tween) => {
              tween.pause();
            });
        }),
        (_this.resume = async (animation) => {
          await ready;
          const anim = _this.animations.find((a) => a.name === animation);
          anim &&
            anim.tweens.forEach((tween) => {
              tween.resume();
            });
        }),
        (_this.updateCount = async () => {
          (await ready,
            await _this.glText.loaded,
            _this.shader.set(
              "uCount",
              new Vector3(
                _this.glText.geometry.letterCount,
                _this.glText.geometry.wordCount,
                _this.glText.geometry.lineCount,
              ),
            ),
            _this.animations.forEach((animation) => {
              const count = getCount(animation.animateBy);
              count !== animation.count &&
                ((animation.count = count),
                animation.texture && animation.texture.destroy(),
                (animation.texture = new DataTexture(
                  new Float32Array(count).fill(0),
                  count,
                  1,
                  Texture.RFormat,
                )),
                (animation.texture.destroyDataAfterUpload = !1),
                animation.texture.upload(),
                _this.shader.set(animation.name, animation.texture));
            }));
        }),
        (_this.getCount = _this.stop =
          async (animation) => {
            await ready;
            const anim = _this.animations.find((a) => a.name === animation);
            anim &&
              anim.tweens.forEach((tween) => {
                tween.stop();
              });
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
          "GLTextAnimation" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }