function XText(_params, ...restArgs) {
      const _this = this;
      (Inherit(_this, Element, _params.as),
        Inherit(_this, ViewUtils),
        Inherit(_this, XComponent),
        (_this.fragName = "XText"),
        (_this.contexts = "Element, _params.as,ViewUtils"),
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
        if (
          ((_this.params.variant = `text-${_this.params.variant || "170-medium"}`),
          (_this.params.text = _this.params.text || "Text"),
          (_this.params.role = _this.params.role || "text"),
          (_this.params.noResize = _this.params.noResize || !1),
          (_this.params.noAria = _this.params.noAria || !1),
          (_this.params.animType = _this.params.animType || "lines"),
          (_this.params.splitType = _this.params.splitType || "lines"),
          (_this.params.noSplit = _this.params.noSplit || !1),
          (_this.params.noBalance = _this.params.noBalance || !1),
          (_this.params.balanceRatio = _this.params.balanceRatio || 1),
          (_this.params.noAutoAnim = _this.params.noAutoAnim || !1),
          (_this.params.fitConfig = _this.params.fitConfig || !1),
          (_this.params.minLines = _this.params.minLines || !1),
          (_this.params.animVariant = _this.params.animVariant || "default"),
          _this.element.clsx(
            _this.params.className,
            _this.params.class,
            _this.params.variant,
          ),
          _this.params.id && _this.element.attr("id", _this.params.id),
          (_this.dataAttribs = Object.entries(_this.params).filter(([k]) =>
            k.startsWith("data-"),
          )),
          _this.dataAttribs.forEach(([k, v]) =>
            _this.element.attr(k, String(v)),
          ),
          _this.params.addSrOnly)
        ) {
          const srOnly = _this.initClass(Element, _this.params.as, [_this.h()]);
          (srOnly.element.text(XText.removeTags(_this.params.text)),
            srOnly.element.clsx("sr-only"),
            (_this.element.div.innerHTML = `<span aria-hidden="true">${_this.params.text}</span>`),
            _this.element.add(srOnly));
        } else _this.element.div.innerHTML = _this.params.text;
        ((_this.splitTextInstance = null),
          (_this.noClip =
            window?.Locale?.CURRENT?.noClip || _this.params.noClip || !1),
          (_this.noSplit =
            window?.Locale?.CURRENT?.noSplit || _this.params.noSplit || !1),
          (_this.noBalance =
            window?.Locale?.CURRENT?.noBalance ||
            _this.params.noBalance ||
            !1));
        let twPromise,
          tweens = [];
        const cacheScreen = { width: 0, height: 0 };
        function onResize() {
          ((cacheScreen.height = 0),
            (cacheScreen.width = 0),
            _this.splitTextInstance
              ? (_this.element.classList().remove("split"),
                _this.splitTextInstance.revert(),
                (_this.fitObj = _this.fit?.()),
                _this.splitTextInstance.split(),
                _this.element.classList().add("split"))
              : (_this.fitObj = _this.fit?.()));
          animateSet(!_this.flag("isVisible"));
        }
        async function prepare(force = !0) {
          (_this.noSplit
            ? (_this.element.classList().add("noSplit"),
              (_this.fitObj = _this.fit?.()),
              _this.noBalance ||
                BalanceText.relayout(
                  _this.element.div,
                  _this.params.balanceRatio,
                  !1,
                ),
              (function checkNoSplitBalance() {
                (_this.element.div.scrollWidth >
                  _this.element.div.offsetWidth ||
                  _this.element.div.scrollWidth >
                    _this.element.div.parentElement?.offsetWidth) &&
                  _this.element.div.style.removeProperty("max-width");
              })(),
              _this.afterSplit?.(_this.noSplit))
            : (_this.element.classList().remove("split"),
              _this.splitTextInstance
                ? (cacheScreen.height === Stage.height &&
                    cacheScreen.width === Stage.width) ||
                  ((cacheScreen.height = Stage.height),
                  (cacheScreen.width = Stage.width),
                  _this.splitTextInstance.revert(),
                  (_this.fitObj = _this.fit?.()),
                  _this.splitTextInstance.split(),
                  _this.element.classList().add("split"),
                  _this.afterSplit?.(_this.noSplit))
                : (await SplitText.isFontReady(),
                  (cacheScreen.height = Stage.height),
                  (cacheScreen.width = Stage.width),
                  (_this.fitObj = _this.fit?.()),
                  (_this.splitTextInstance = _this.createFragment(
                    SplitText,
                    _this.element,
                    {
                      type: _this.params.splitType,
                      noAriaLabel: _this.params.noAria,
                      noBalance: _this.noBalance,
                      balanceRatio: _this.params.balanceRatio,
                      minLines: _this.params.minLines,
                    },
                  )),
                  (_this.animChars =
                    "chars" === _this.params.animType &&
                    _this.splitTextInstance.byChars),
                  (_this.animWords = "words" === _this.params.animType),
                  (_this.animWordsAsLines =
                    "lines" === _this.params.animType &&
                    _this.splitTextInstance.byWords &&
                    _this.splitTextInstance.byLines),
                  (_this.animLines =
                    "lines" === _this.params.animType &&
                    !_this.splitTextInstance.byWords &&
                    !_this.splitTextInstance.byChars),
                  _this.element.classList().add("split"),
                  _this.afterSplit?.(_this.noSplit))),
            _this.flag("isVisible", !force),
            animateSet(force),
            _this.flag("isReady", !0));
        }
        function clearTweens() {
          return (
            tweens.forEach((t) => t.stop()),
            (tweens = []),
            twPromise?.resolve?.(),
            (twPromise = Promise.create()),
            twPromise
          );
        }
        function animateSet(force = !0) {
          (_this.noSplit || _this.splitTextInstance) &&
            (_this.noSplit
              ? _this.element.css({ opacity: force ? 0 : 1 })
              : _this.noClip
                ? _this.splitTextInstance.lines.forEach((l) => {
                    (l.css({ whiteSpace: "nowrap", opacity: force ? 0 : 1 }),
                      l.transform({ y: force ? "105%" : "0%" }));
                  })
                : ((_this.animWordsAsLines ||
                    _this.animChars ||
                    _this.animWords) &&
                    _this.splitTextInstance.lines.forEach((l) =>
                      l.css({
                        whiteSpace: "nowrap",
                        overflow:
                          "blur" !== _this.params.animVariant && "hidden",
                      }),
                    ),
                  _this.animChars
                    ? _this.splitTextInstance.chars.forEach((c) => {
                        c.transform({ y: force ? "105%" : "0%" });
                      })
                    : _this.animWordsAsLines || _this.animWords
                      ? _this.splitTextInstance.words.forEach((w) => {
                          w.transform({ y: force ? "105%" : "0%" });
                        })
                      : _this.animLines &&
                        _this.splitTextInstance.lines.forEach((l) => {
                          (l.transform({ y: force ? "105%" : "0%" }),
                            l.css({ opacity: force ? 0 : 1 }));
                        })));
        }
        (_this.parentView &&
          !_this.params?.noAutoAnim &&
          _this.parentView?.addChildInstance?.(_this),
          _this.params.noResize || _this.onViewResize(onResize),
          _this.params.noAutoAnim || prepare(),
          (_this.prepare = prepare),
          (_this.setText = function setText(value, skip = !1) {
            if (_this.splitTextInstance && !skip) {
              (_this.element.classList().remove("split"),
                _this.splitTextInstance.revert(),
                (_this.element.div.__originalText = null),
                _this.element.html(value),
                (_this.fitObj = _this.fit?.()),
                _this.splitTextInstance.split(),
                _this.element.classList().add("split"),
                _this.afterSplit?.(_this.noSplit));
              animateSet(!_this.flag("isVisible"));
            } else
              ((_this.element.div.__originalText = null),
                _this.element.html(value),
                (_this.fitObj = _this.fit?.()));
          }),
          (_this.resize = onResize),
          (_this.animateSet = async (value = !0) => {
            (await _this.wait("isReady"),
              _this.flag("isVisible", !value),
              animateSet(value));
          }),
          (_this.animateIn = async (...animParams) => {
            if (!_this.flag("isVisible"))
              return (
                await _this.wait("isReady"),
                _this.flag("isVisible", !0),
                (function animateIn(
                  delay = 0,
                  {
                    duration: duration = 800,
                    stagger: stagger = 0,
                    ease: ease = "easeOutCubic",
                  } = {},
                ) {
                  const promise = clearTweens();
                  if (
                    ((delay = "number" == typeof delay ? delay : 0),
                    _this.noSplit)
                  ) {
                    const tw = _this.element.tween(
                      { opacity: 1 },
                      duration,
                      ease,
                      delay,
                    );
                    (tw.onComplete(promise.resolve), tweens.push(tw));
                  } else
                    _this.noClip
                      ? _this.splitTextInstance.lines.forEach((l, i, arr) => {
                          const tw = l
                            .tween(
                              { opacity: 1, y: "0%", clear: !0 },
                              duration,
                              ease,
                              delay + i * stagger,
                            )
                            .onComplete(() => {
                              i === arr.length - 1 && promise.resolve();
                            });
                          tweens.push(tw);
                        })
                      : _this.animChars
                        ? _this.splitTextInstance.chars.forEach((c, i, arr) => {
                            c.tween(
                              { y: "0%", clear: !0 },
                              duration,
                              ease,
                              delay + i * stagger,
                            ).onComplete(() => {
                              i === arr.length - 1 && promise.resolve();
                            });
                          })
                        : _this.animWordsAsLines || _this.animWords
                          ? _this.splitTextInstance.words.forEach(
                              (w, i, arr) => {
                                const animationDelay = _this.animWordsAsLines
                                    ? delay + w.div.__line * stagger
                                    : delay + i * stagger,
                                  tw = w
                                    .tween(
                                      { y: "0%", clear: !0 },
                                      duration,
                                      ease,
                                      animationDelay,
                                    )
                                    .onComplete(() => {
                                      i === arr.length - 1 && promise.resolve();
                                    });
                                tweens.push(tw);
                              },
                            )
                          : _this.animLines &&
                            _this.splitTextInstance.lines.forEach(
                              (l, i, arr) => {
                                const tw = l
                                  .tween(
                                    { opacity: 1, y: "0%", clear: !0 },
                                    duration,
                                    ease,
                                    delay + i * stagger,
                                  )
                                  .onComplete(() => {
                                    i === arr.length - 1 && promise.resolve();
                                  });
                                tweens.push(tw);
                              },
                            );
                  return promise;
                })(...animParams)
              );
          }),
          (_this.animateOut = async (...animParams) => {
            if (_this.flag("isVisible"))
              return (
                await _this.wait("isReady"),
                _this.flag("isVisible", !1),
                (function animateOut(
                  delay = 0,
                  {
                    duration: duration = 800,
                    stagger: stagger = 25,
                    ease: ease = "easeOutCubic",
                  } = {},
                ) {
                  const promise = clearTweens();
                  if (
                    ((delay = "number" == typeof delay ? delay : 0),
                    _this.noSplit)
                  ) {
                    const tw = _this.element.tween(
                      { opacity: 0 },
                      duration,
                      ease,
                      delay,
                    );
                    (tw.onComplete(promise.resolve), tweens.push(tw));
                  } else
                    _this.noClip
                      ? _this.splitTextInstance.lines.forEach((l, i, arr) => {
                          const tw = l
                            .tween(
                              { opacity: 0, y: "-112%" },
                              duration,
                              ease,
                              delay + i * stagger,
                            )
                            .onComplete(() => {
                              (l.transform({ y: "105%" }),
                                i === arr.length - 1 && promise.resolve());
                            });
                          tweens.push(tw);
                        })
                      : _this.animChars
                        ? _this.splitTextInstance.chars.forEach((c, i, arr) => {
                            const tw = c
                              .tween(
                                { y: "-112%" },
                                duration,
                                ease,
                                delay + i * stagger,
                              )
                              .onComplete(() => {
                                (c.transform({ y: "105%" }),
                                  i === arr.length - 1 && promise.resolve());
                              });
                            tweens.push(tw);
                          })
                        : _this.animWordsAsLines || _this.animWords
                          ? _this.splitTextInstance.words.forEach(
                              (w, i, arr) => {
                                const animationDelay = _this.animWordsAsLines
                                    ? delay + w.div.__line * stagger
                                    : delay + i * stagger,
                                  tw = w
                                    .tween(
                                      { y: "-112%" },
                                      duration,
                                      ease,
                                      animationDelay,
                                    )
                                    .onComplete(() => {
                                      (w.transform({ y: "105%" }),
                                        i === arr.length - 1 &&
                                          promise.resolve());
                                    });
                                tweens.push(tw);
                              },
                            )
                          : _this.animLines &&
                            _this.splitTextInstance.lines.forEach(
                              (l, i, arr) => {
                                const tw = l
                                  .tween(
                                    { opacity: 0, y: "-112%" },
                                    duration,
                                    ease,
                                    delay + i * stagger,
                                  )
                                  .onComplete(() => {
                                    (l.transform({ y: "105%" }),
                                      i === arr.length - 1 &&
                                        promise.resolve());
                                  });
                                tweens.push(tw);
                              },
                            );
                  return promise;
                })(...animParams)
              );
          }),
          (_this.useFit = (config, fireAtStart = !1) => {
            ((_this.fit = (extraConfig) =>
              FitText.fit({
                el: _this.element.div,
                ...config,
                ...extraConfig,
              })),
              fireAtStart && _this.fit());
          }),
          _this.params.fitConfig &&
            "object" == typeof _this.params.fitConfig &&
            _this.useFit(
              _this.params.fitConfig,
              _this.params.fitConfig.immediate,
            ),
          (_this.ready = (_) => _this.wait("isReady")),
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
            "XText" !== _this.fragName ||
            !_this.onInit ||
            _this.onInit.calledInit ||
            (onInit = _this.onInit),
          onInit &&
            (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
      })();
    }