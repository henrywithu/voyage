function SplitTextPlayground(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element, "main"),
      Inherit(_this, XComponent),
      (_this.fragName = "SplitTextPlayground"),
      (_this.contexts = "Element, 'main'"),
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
              _type: "h1",
              _innerText: "Split Text",
              refName: "unnamed",
              children: [],
            },
            {
              _type: "div",
              refName: "unnamed",
              children: [
                {
                  className: "col",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      id: "input-text",
                      rows: 10,
                      placeholder: "Enter text to split",
                      _type: "textarea",
                      refName: "unnamed",
                      children: [],
                    },
                    {
                      _type: "fieldset",
                      refName: "unnamed",
                      children: [
                        {
                          _type: "legend",
                          _innerText: "Options",
                          refName: "unnamed",
                          children: [],
                        },
                        {
                          _type: "div",
                          refName: "unnamed",
                          children: [
                            {
                              type: "text",
                              id: "input-lang",
                              value: "en",
                              placeholder: "en",
                              _type: "input",
                              refName: "unnamed",
                              children: [],
                            },
                            {
                              htmlFor: "input-lang",
                              _type: "label",
                              _innerText: "Language code",
                              refName: "unnamed",
                              children: [],
                            },
                          ],
                        },
                        {
                          _type: "div",
                          refName: "unnamed",
                          children: [
                            {
                              type: "checkbox",
                              id: "input-rtl",
                              _type: "input",
                              refName: "unnamed",
                              children: [],
                            },
                            {
                              htmlFor: "input-rtl",
                              _type: "label",
                              _innerText: "RTL",
                              refName: "unnamed",
                              children: [],
                            },
                          ],
                        },
                        {
                          _type: "fieldset",
                          refName: "unnamed",
                          children: [
                            {
                              _type: "legend",
                              _innerText: "Split Text",
                              refName: "unnamed",
                              children: [],
                            },
                            {
                              _type: "div",
                              refName: "unnamed",
                              children: [
                                {
                                  type: "checkbox",
                                  id: "input-type-lines",
                                  checked: !0,
                                  _type: "input",
                                  refName: "unnamed",
                                  children: [],
                                },
                                {
                                  htmlFor: "input-type-lines",
                                  _type: "label",
                                  _innerText: "Lines",
                                  refName: "unnamed",
                                  children: [],
                                },
                              ],
                            },
                            {
                              _type: "div",
                              refName: "unnamed",
                              children: [
                                {
                                  type: "checkbox",
                                  id: "input-type-words",
                                  _type: "input",
                                  refName: "unnamed",
                                  children: [],
                                },
                                {
                                  htmlFor: "input-type-words",
                                  _type: "label",
                                  _innerText: "Words",
                                  refName: "unnamed",
                                  children: [],
                                },
                              ],
                            },
                            {
                              _type: "div",
                              refName: "unnamed",
                              children: [
                                {
                                  type: "checkbox",
                                  id: "input-type-chars",
                                  _type: "input",
                                  refName: "unnamed",
                                  children: [],
                                },
                                {
                                  htmlFor: "input-type-chars",
                                  _type: "label",
                                  _innerText: "Chars",
                                  refName: "unnamed",
                                  children: [],
                                },
                              ],
                            },
                            {
                              _type: "div",
                              refName: "unnamed",
                              children: [
                                {
                                  type: "checkbox",
                                  id: "input-no-aria-label",
                                  _type: "input",
                                  refName: "unnamed",
                                  children: [],
                                },
                                {
                                  htmlFor: "input-no-aria-label",
                                  _type: "label",
                                  _innerText: "No aria-label",
                                  refName: "unnamed",
                                  children: [],
                                },
                              ],
                            },
                            {
                              _type: "div",
                              refName: "unnamed",
                              children: [
                                {
                                  type: "checkbox",
                                  id: "input-no-balance",
                                  _type: "input",
                                  refName: "unnamed",
                                  children: [],
                                },
                                {
                                  htmlFor: "input-no-balance",
                                  _type: "label",
                                  refName: "unnamed",
                                  children: [
                                    {
                                      _type: "inlinetext",
                                      _innerText: "No balance",
                                      refName: "unnamed",
                                      children: [],
                                    },
                                    {
                                      _type: "br",
                                      refName: "unnamed",
                                      children: [],
                                    },
                                    {
                                      _type: "small",
                                      _innerText:
                                        "turn off the balance-text library",
                                      refName: "unnamed",
                                      children: [],
                                    },
                                  ],
                                },
                              ],
                            },
                            {
                              _type: "div",
                              refName: "unnamed",
                              children: [
                                {
                                  type: "range",
                                  id: "input-balance-ratio",
                                  step: 0.01,
                                  min: 0,
                                  _type: "input",
                                  refName: "unnamed",
                                  children: [],
                                },
                                {
                                  htmlFor: "input-balance-ratio",
                                  _type: "label",
                                  _innerText: "Balance ratio",
                                  refName: "unnamed",
                                  children: [],
                                },
                              ],
                            },
                            {
                              _type: "div",
                              refName: "unnamed",
                              children: [
                                {
                                  type: "number",
                                  id: "input-min-lines",
                                  min: 1,
                                  value: 1,
                                  _type: "input",
                                  refName: "unnamed",
                                  children: [],
                                },
                                {
                                  htmlFor: "input-min-lines",
                                  _type: "label",
                                  _innerText: "Min lines",
                                  refName: "unnamed",
                                  children: [],
                                },
                              ],
                            },
                            {
                              _type: "div",
                              refName: "unnamed",
                              children: [
                                {
                                  type: "range",
                                  id: "input-line-threshold",
                                  step: 0.01,
                                  min: 0,
                                  max: 1,
                                  value: 0.2,
                                  _type: "input",
                                  refName: "unnamed",
                                  children: [],
                                },
                                {
                                  htmlFor: "input-line-threshold",
                                  _type: "label",
                                  _innerText: "Line threshold",
                                  refName: "unnamed",
                                  children: [],
                                },
                              ],
                            },
                            {
                              _type: "div",
                              refName: "unnamed",
                              children: [
                                {
                                  type: "checkbox",
                                  id: "input-debug",
                                  checked: !0,
                                  _type: "input",
                                  refName: "unnamed",
                                  children: [],
                                },
                                {
                                  htmlFor: "input-debug",
                                  _type: "label",
                                  _innerText: "Debug",
                                  refName: "unnamed",
                                  children: [],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          _type: "fieldset",
                          refName: "unnamed",
                          children: [
                            {
                              _type: "legend",
                              _innerText: "Styles",
                              refName: "unnamed",
                              children: [],
                            },
                            {
                              _type: "div",
                              refName: "unnamed",
                              children: [
                                {
                                  type: "range",
                                  id: "input-font-size",
                                  min: 10,
                                  max: 100,
                                  value: 16,
                                  _type: "input",
                                  refName: "unnamed",
                                  children: [],
                                },
                                {
                                  htmlFor: "input-font-size",
                                  _type: "label",
                                  _innerText: "Font size",
                                  refName: "unnamed",
                                  children: [],
                                },
                              ],
                            },
                            {
                              _type: "div",
                              refName: "unnamed",
                              children: [
                                {
                                  type: "checkbox",
                                  id: "input-balance",
                                  value: "balance",
                                  checked: !0,
                                  _type: "input",
                                  refName: "unnamed",
                                  children: [],
                                },
                                {
                                  htmlFor: "input-balance",
                                  _type: "label",
                                  refName: "unnamed",
                                  children: [
                                    {
                                      _type: "inlinetext",
                                      _innerText: "text-wrap: balance",
                                      refName: "unnamed",
                                      children: [],
                                    },
                                    {
                                      _type: "br",
                                      refName: "unnamed",
                                      children: [],
                                    },
                                    {
                                      _type: "small",
                                      _innerText:
                                        "preferred way on modern browsers",
                                      refName: "unnamed",
                                      children: [],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  className: "col",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      className: "output-container",
                      _type: "div",
                      refName: "unnamed",
                      children: [
                        {
                          id: "output-text",
                          _type: "div",
                          refName: "unnamed",
                          children: [],
                        },
                      ],
                    },
                    {
                      id: "output-revert",
                      _type: "button",
                      _innerText: "Revert",
                      refName: "unnamed",
                      children: [],
                    },
                    {
                      id: "original-text",
                      _type: "div",
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
      ((_this.onMounted = () => {
        Mobile.allowNativeScroll(!0);
        const inputText = document.getElementById("input-text"),
          outputText = document.getElementById("output-text"),
          originalText = document.getElementById("original-text"),
          revertButton = document.getElementById("output-revert"),
          lang = document.getElementById("input-lang"),
          rtl = document.getElementById("input-rtl"),
          typeLines = document.getElementById("input-type-lines"),
          typeWords = document.getElementById("input-type-words"),
          typeChars = document.getElementById("input-type-chars"),
          noAriaLabel = document.getElementById("input-no-aria-label"),
          noBalance = document.getElementById("input-no-balance"),
          cssBalance = document.getElementById("input-balance"),
          balanceRatio = document.getElementById("input-balance-ratio"),
          minLines = document.getElementById("input-min-lines"),
          lineThreshold = document.getElementById("input-line-threshold"),
          debug = document.getElementById("input-debug"),
          fontSize = document.getElementById("input-font-size");
        balanceRatio.setAttribute("max", "1");
        let splitInstance = null;
        const getOptions = () => {
            const types = [];
            return (
              typeLines.checked && types.push("lines"),
              typeWords.checked && types.push("words"),
              typeChars.checked && types.push("chars"),
              cssBalance.checked
                ? (noBalance.setAttribute("disabled", "disabled"),
                  balanceRatio.setAttribute("disabled", "disabled"))
                : (noBalance.removeAttribute("disabled"),
                  balanceRatio.removeAttribute("disabled")),
              {
                type: types.join(","),
                cssBalance: cssBalance.checked,
                noAriaLabel: noAriaLabel.checked,
                noBalance: noBalance.checked,
                balanceRatio: Number(balanceRatio.value),
                minLines: Number(minLines.value),
                lineThreshold: Number(lineThreshold.value),
                fontSize: Number(fontSize.value),
                lang: lang.value,
                rtl: rtl.checked,
                debug: debug.checked,
              }
            );
          },
          updateSplit = (force = !1) => {
            (outputText.setAttribute("dir", rtl.checked ? "rtl" : "ltr"),
              outputText.classList.remove("split"),
              outputText.style.removeProperty("max-width"),
              cssBalance.checked
                ? (outputText.style.setProperty("text-wrap", "balance"),
                  originalText.style.setProperty("text-wrap", "balance"))
                : (outputText.style.removeProperty("text-wrap"),
                  originalText.style.removeProperty("text-wrap")));
            const text = inputText.value.trim();
            text &&
              (localStorage.setItem("split-text-input", text),
              (originalText.innerHTML = text),
              (outputText.innerHTML = text),
              (splitInstance = new SplitText(
                outputText,
                (force &&
                  JSON.parse(localStorage.getItem("split-text-options"))) ||
                  getOptions(),
              )),
              localStorage.setItem(
                "split-text-options",
                JSON.stringify(getOptions()),
              ),
              outputText.classList.add("split"));
          },
          updateFontSize = () => {
            ((outputText.style.fontSize = `${fontSize.value}px`),
              (originalText.style.fontSize = `${fontSize.value}px`),
              updateSplit(!1));
          },
          updateLang = () => {
            (document.documentElement.setAttribute("lang", lang.value),
              outputText.setAttribute("dir", rtl.checked ? "rtl" : "ltr"),
              (SplitText.segmenter = null),
              SplitText.setupSegmenter(),
              updateSplit(!1));
          };
        (inputText.addEventListener("input", () => updateSplit(!1)),
          fontSize.addEventListener("input", updateFontSize),
          lang.addEventListener("input", updateLang),
          [
            typeLines,
            typeWords,
            typeChars,
            noAriaLabel,
            noBalance,
            cssBalance,
            balanceRatio,
            minLines,
            lineThreshold,
            rtl,
            debug,
          ].forEach((checkbox) => {
            checkbox.addEventListener("change", () => updateSplit(!1));
          }),
          revertButton.addEventListener("click", () => {
            (outputText.style.removeProperty("max-width"),
              splitInstance &&
                (splitInstance.revert(), (splitInstance = null)));
          }),
          window.addEventListener("resize", () => {
            updateSplit(!1);
          }),
          (inputText.value =
            localStorage.getItem("split-text-input") ||
            '\n    <h1>split anything 🐳 🍔 🍕 into words, chars, lines</h1>\n    <p>Try typing some text to see it split into lines, words, and characters!</p>\n    <p> Link <a href="https://www.google.com">here</a></p>\n    <ul>\n        <li>pizza <b>margherita</b></li>\n        <li>hamburger</li>\n        <li>taco</li>\n        </ul>\n    '.trim()),
          (() => {
            const options = localStorage.getItem("split-text-options")
              ? JSON.parse(localStorage.getItem("split-text-options"))
              : getOptions();
            ((lang.value = options.lang),
              (rtl.checked = options.rtl),
              (typeLines.checked = options.type.includes("lines")),
              (typeWords.checked = options.type.includes("words")),
              (typeChars.checked = options.type.includes("chars")),
              (noAriaLabel.checked = options.noAriaLabel),
              (noBalance.checked = options.noBalance),
              (cssBalance.checked = options.cssBalance),
              (balanceRatio.value = options.balanceRatio),
              (minLines.value = options.minLines),
              (lineThreshold.value = options.lineThreshold),
              (fontSize.value = options.fontSize),
              (debug.checked = options.debug),
              updateFontSize(),
              updateLang(),
              updateSplit(!0));
          })());
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
          "SplitTextPlayground" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }