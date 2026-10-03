function UILToolsTab(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "UILToolsTab"),
      (_this.contexts = "Element"),
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
              className: "panel-publish-buttons",
              _type: "div",
              refName: "publishActions",
              children: [
                { _type: "div", refName: "publishButtons", children: [] },
                {
                  _type: "div",
                  refName: "status",
                  children: [
                    { _type: "UILSpinner", refName: "spinner", children: [] },
                    { _type: "div", refName: "icon", children: [] },
                    {
                      className: "message",
                      _type: "p",
                      refName: "unnamed",
                      children: [
                        { _type: "span", refName: "icon", children: [] },
                        {
                          _type: "span",
                          _innerText: "$state.message",
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
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      function updateStatus() {
        let publishing = _this.getSync("UIL/publishing"),
          errorInfo = _this.getSync("UIL/publishError"),
          publishedType = _this.state.publishedType;
        (errorInfo
          ? (_this.icon.text("⚠️").show(),
            (_this.state.message = `Publish error: ${errorInfo.error.message || errorInfo.error.toString()}`))
          : publishing
            ? (_this.icon.text("").hide(),
              (_this.state.message = `Publishing to ${publishing.type}...`))
            : publishedType &&
              (_this.icon.text("✅").show(),
              (_this.state.message = `Successfully published to ${publishedType}.`)),
          publishing
            ? _this.spinner.element.show()
            : _this.spinner.element.hide(),
          (_this.state.showStatus = !!(
            publishing ||
            errorInfo ||
            publishedType
          )));
      }
      ((_this.state.showStatus = !1),
        (_this.onInit = async () => {
          let envs = ["staging", "production"];
          if (
            Array.isArray(window.USE_PUBLISHED_UIL_FOR_ENVS) &&
            window.USE_PUBLISHED_UIL_FOR_ENVS.length
          )
            envs = window.USE_PUBLISHED_UIL_FOR_ENVS;
          else if (Hydra.LOCAL) {
            let buildJson = await get("../Tools/build.json");
            Array.isArray(buildJson.USE_PUBLISHED_UIL_FOR_ENVS) &&
              buildJson.USE_PUBLISHED_UIL_FOR_ENVS.length &&
              (envs = buildJson.USE_PUBLISHED_UIL_FOR_ENVS);
          }
          _this.buttons = envs.map((environment, i) => {
            let button = _this.publishButtons.create("button", "button");
            return (
              button.classList().add("small"),
              i === envs.length - 1 && button.classList().add("solid"),
              button.text(`Publish to ${environment.capitalize()}`),
              button.click(() =>
                (function handlePublishClick(environment) {
                  confirm(
                    `Are you sure you want to publish UIL to ${environment}? Remember to save your changes first. (Cmd+S or Ctrl+S)`,
                  ) &&
                    (function publish(type) {
                      ((_this.state.publishedType = type),
                        _this.fire("UIL/publish", { type: type }));
                    })(environment);
                })(environment),
              ),
              button
            );
          });
        }),
        _this.bind(
          "UIL/publishing",
          function handlePublishingChange(publishing) {
            _this.buttons.forEach((button) => {
              button.attr("disabled", publishing ? "disabled" : null);
            });
          },
        ),
        _this.bind("UIL/publishing", updateStatus),
        _this.bind("UIL/publishError", updateStatus),
        _this.bind(_this.state, "showStatus", (showStatus) => {
          showStatus ? _this.status.show() : _this.status.hide();
        }),
        _this.element.goob(
          "\n    .panel-publish-buttons {\n        padding: var(--spacing);\n        .publishButtons {\n            display: flex;\n            flex-wrap: wrap;\n            gap: var(--spacing-small);\n\n            .button {\n                flex: 1;\n                &[disabled] {\n                    cursor: not-allowed !important;\n                }\n            }\n        }\n        .status {\n            margin-top: var(--spacing-small);\n            display: flex;\n            gap: var(--spacing-small);\n            align-items: center;\n        }\n        .message {\n            display: flex;\n            align-items: flex-start;\n            gap: var(--spacing-small);\n            margin: 0;\n        }\n    }\n",
        ),
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
          "UILToolsTab" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }