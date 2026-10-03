function UILTabs(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, Element),
      Inherit(_this, XComponent),
      (_this.fragName = "UILTabs"),
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
              _type: "header",
              refName: "tabsHeader",
              children: [
                {
                  _type: "nav",
                  refName: "nav",
                  children: [
                    {
                      view: "UILTabsNavItem",
                      data: "$state.tabsData",
                      _type: "ViewState",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              _type: "section",
              refName: "tabsContent",
              children: [
                {
                  view: "UILTabsContentItem",
                  data: "$state.tabsData",
                  _type: "ViewState",
                  refName: "unnamed",
                  children: [],
                },
              ],
            },
            {
              click: "$handleHistoryClick",
              _type: "button",
              refName: "historyButton",
              children: [],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.ready = !1),
        _this.createState(),
        _this.state.set("tabsData", new StateArray(_this.params)),
        _this.state.set("activeIndex", 0),
        _this.state.set("historyLabel", "History"),
        _this.state.bind("historyLabel", _this.historyButton),
        (_this.onMounted = async () => {
          (_this.historyButton.hide(),
            (function initListeners() {
              (_this.bindState(_this.state, "activeIndex", (value) => {
                !(function updateActiveTab() {
                  (_this.state.tabsData.forEach((tab, index) => {
                    tab.active = _this.state.activeIndex === index;
                  }),
                    _this.tabsContent.tween(
                      {
                        x:
                          -_this.element.div.offsetWidth *
                          _this.state.activeIndex,
                      },
                      200,
                      "easeOutCubic",
                    ));
                })();
              }),
                _this.bind("UILPanel/historyPanelToggle", (value) => {
                  value
                    ? _this.state.set("historyLabel", "Hide History")
                    : _this.state.set("historyLabel", "History");
                }));
            })(),
            _this.element.attr(
              "style",
              `\n        --tab-content-width: 300px;\n        --tab-count: ${_this.state.tabsData.length};\n    `,
            ),
            (_this.ready = !0));
        }),
        _this.listen("UILTabsNavItem/click", (event) => {
          _this.state.tabsData.forEach((tab, index) => {
            tab.id === event.id && _this.state.set("activeIndex", index);
          });
        }),
        (_this.handleHistoryClick = () => {
          _this.fire("toggle-history-panel");
        }),
        (_this.setActiveTab = (index) => {
          _this.state.set("activeIndex", index);
        }),
        (_this.addTab = (tabData) => {}),
        (_this.removeTab = (tabId) => {}),
        (_this.setDisabledTab = (tabId) => {}),
        (_this.setHiddenTab = (tabId) => {}),
        (_this.addGraph = (graph) => {
          _this.state.tabsData.find((tab) => "playground" === tab.id).content =
            graph;
        }),
        (_this.addGlobalFolder = (folder) => {
          const tabData = _this.state.tabsData.find(
            (tab) => "global" === tab.id,
          );
          (folder instanceof UILFolder &&
            (tabData.content instanceof UILFolder
              ? (folder = [tabData.content, folder])
              : Array.isArray(tabData.content) &&
                (folder = [...tabData.content, folder])),
            (tabData.content = folder));
        }),
        (_this.showHistoryButton = async () => {
          (await _this.wait(() => _this.ready), await defer());
        }),
        _this.element.goob(
          "\n    & {\n        box-sizing: border-box;\n        color: #fff;\n        width: 100%;\n        height: 100%;\n        overflow: hidden;\n        position: relative;\n    }\n\n    .tabsHeader {\n        background-color: var(--panel-background-color);\n        border-bottom: var(--border);\n        font: var(--label3-semi);\n        padding-left: var(--spacing-small);\n    }\n    \n    .nav {\n        display: flex;\n        width: 100%;\n    }\n\n    .tabsContent {\n        display: flex;\n        width: calc(var(--tab-content-width) * var(--tab-count));\n        height: 100%;\n\n        .UILPanel.global & {\n            height: calc(100% - 39px);\n        }\n    }\n\n    .UILTabsContentItem {\n        width: var(--tab-content-width);\n    }\n\n    .historyButton {\n        background-color: var(--color-neutral-20);\n        border: none;\n        color: var(--color-neutral-70);\n        border-radius: 0;\n        width: 100%;\n        text-align-last: left;\n        position: absolute;\n        bottom: 0;\n        left: 0;\n        padding: var(--spacing-small);\n\n        &:hover {\n            color: var(--color-white);\n        }\n    }\n",
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
          "UILTabs" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }