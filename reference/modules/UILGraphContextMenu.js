function UILGraphContextMenu(_params, ...restArgs) {
      const _this = this;
      (Inherit(_this, Element),
        Inherit(_this, XComponent),
        (_this.fragName = "UILGraphContextMenu"),
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
                _type: "div",
                refName: "wrapper",
                children: [
                  {
                    _type: "div",
                    refName: "buttons",
                    children: [
                      {
                        view: "UILGraphContextMenuButton",
                        data: "$buttonsData",
                        _type: "ViewState",
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
        const {
            LAYOUT_TYPE: LAYOUT_TYPE,
            STAGE_LAYOUT_TYPE: STAGE_LAYOUT_TYPE,
            GROUP_TYPE: GROUP_TYPE,
            LAYER_TYPE: LAYER_TYPE,
            SPECIAL_TYPE: SPECIAL_TYPE,
          } = UILGraph,
          {
            ACTION: ACTION,
            DELETE: DELETE,
            COPY_LAYOUT: COPY_LAYOUT,
            PASTE_LAYOUT: PASTE_LAYOUT,
            ADD_LAYER: ADD_LAYER,
            COPY_LAYER: COPY_LAYER,
            PASTE_LAYER: PASTE_LAYER,
            DUPLICATE_LAYER: DUPLICATE_LAYER,
            CINEMA: CINEMA,
            FIGMA: FIGMA,
            ADD_GROUP: ADD_GROUP,
            DUPLICATE_GROUP: DUPLICATE_GROUP,
            COPY_GROUP: COPY_GROUP,
            PASTE_GROUP: PASTE_GROUP,
          } = UILGraphContextMenu;
        let _sourceButtonsData = [
          {
            label: "Add Layer",
            uilContexts: [GROUP_TYPE, STAGE_LAYOUT_TYPE, LAYOUT_TYPE],
            action: ADD_LAYER,
          },
          {
            label: "Copy Layer",
            uilContexts: [LAYER_TYPE],
            action: COPY_LAYER,
          },
          {
            label: "Paste Layer",
            uilContexts: [LAYOUT_TYPE, GROUP_TYPE, LAYER_TYPE],
            action: PASTE_LAYER,
          },
          {
            label: "Duplicate Layer",
            uilContexts: [STAGE_LAYOUT_TYPE, LAYER_TYPE],
            action: DUPLICATE_LAYER,
          },
          {
            label: "Add Group",
            uilContexts: [LAYOUT_TYPE, GROUP_TYPE],
            action: ADD_GROUP,
          },
          {
            label: "Duplicate Group",
            uilContexts: [GROUP_TYPE, STAGE_LAYOUT_TYPE],
            action: DUPLICATE_GROUP,
          },
          {
            label: "Copy Group",
            uilContexts: [GROUP_TYPE],
            action: COPY_GROUP,
          },
          {
            label: "Paste Group",
            uilContexts: [LAYOUT_TYPE, GROUP_TYPE, LAYER_TYPE],
            action: PASTE_GROUP,
          },
          {
            label: "Copy Layout",
            uilContexts: [LAYOUT_TYPE],
            action: COPY_LAYOUT,
          },
          {
            label: "Paste Layout",
            uilContexts: [LAYOUT_TYPE],
            action: PASTE_LAYOUT,
          },
          { label: "Apply Figma Config", uilContexts: [], action: FIGMA },
          {
            label: "Delete",
            uilContexts: [GROUP_TYPE, STAGE_LAYOUT_TYPE, LAYER_TYPE],
            action: DELETE,
          },
        ];
        UIL.CMS_ONLY &&
          (_sourceButtonsData = [
            {
              label: "Add",
              uilContexts: [GROUP_TYPE, STAGE_LAYOUT_TYPE, LAYOUT_TYPE],
              action: ADD_LAYER,
            },
            {
              label: "Delete",
              uilContexts: [GROUP_TYPE, STAGE_LAYOUT_TYPE, LAYER_TYPE],
              action: DELETE,
            },
          ]);
        const specialCases = {};
        ((specialCases[CINEMA] = [
          () => "Config" == _this.get("UIL/ContextMenu").targetId,
        ]),
          (specialCases[FIGMA] = [
            () => _this.get("UIL/ContextMenu").targetId.endsWith("Root"),
          ]),
          (_this.buttonsData = new StateArray([])),
          (_this.offset = {}),
          _this.element.hide(),
          window.addEventListener("click", () =>
            _this.set("UIL/ContextMenu", null),
          ),
          _this.bind("UIL/ContextMenu", (openContext) => {
            if (!openContext)
              return (function hideContextMenu() {
                return (_this.element.mouseEnabled(!1), _this.element.hide());
              })();
            openContext.fromKeyboard ||
              (!(function filterButtons(context) {
                if (!context) return;
                _this.buttonsData.refresh(
                  JSON.parse(JSON.stringify(_sourceButtonsData)).filter(
                    (b) =>
                      b.uilContexts.includes(context.type) ||
                      (specialCases[b.action] &&
                        specialCases[b.action]
                          .map((fn) => fn())
                          .reduce((a, b) => a() || b())),
                  ),
                );
              })(openContext),
              (function positionAndShowContextMenu() {
                const margin = 7;
                let x = Mouse.x + margin - _this.offset.x;
                x > Stage.width - 160 &&
                  (x = Mouse.x - 160 - margin - _this.offset.x);
                let y = Mouse.y + margin - _this.offset.y;
                y > Stage.height - 75 &&
                  (y = Mouse.y - 75 - margin - _this.offset.y);
                ((y +=
                  UIL.global.element.div.querySelector(".UILTabsContentItem")
                    ?.scrollTop || 0),
                  _this.element.transform({ x: x, y: y }),
                  _this.element.show());
              })(),
              _this.element.mouseEnabled(!0));
          }),
          (_this.setOffset = ({ x: x, y: y }) =>
            (_this.offset = { x: x, y: y })),
          _this.element.goob(
            "\n    position: absolute;\n    width: auto;\n    height: auto;\n    padding-top: 10px;\n    padding-bottom: 10px;\n    color: black;\n    background-color: #303030;\n    border-radius: 12px;\n    line-height: 2px;\n    overflow: hidden;\n    user-select: none;\n    z-index: 999999;\n",
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
            "UILGraphContextMenu" !== _this.fragName ||
            !_this.onInit ||
            _this.onInit.calledInit ||
            (onInit = _this.onInit),
          onInit &&
            (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
      })();
    }