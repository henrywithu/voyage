function UILGraphLayer(_data, _index, _params) {
    const _this = this;
    (Inherit(_this, ViewStateElement),
      Inherit(_this, Element),
      Inherit(_this, DragAndDrop),
      Inherit(_this, XComponent),
      (_this.fragName = "UILGraphLayer"),
      (_this.contexts = "ViewStateElement,Element,DragAndDrop"),
      (_this.data = _data),
      (_this.index = _index),
      (_this.params = _params),
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
              click: "$onClick",
              _type: "div",
              refName: "wrapper",
              children: [
                { _type: "div", refName: "line", children: [] },
                {
                  _type: "div",
                  refName: "dropTarget",
                  children: [
                    { _type: "div", refName: "highlight", children: [] },
                  ],
                },
                {
                  tabIndex: 1,
                  _type: "a",
                  refName: "header",
                  children: [
                    { _type: "div", refName: "typeIcon", children: [] },
                    {
                      tabIndex: 1,
                      _type: "div",
                      refName: "title",
                      children: [
                        {
                          _type: "div",
                          _innerText: "$data.titleString",
                          refName: "titleInner",
                          children: [],
                        },
                        {
                          value: "$data.name",
                          _type: "input",
                          refName: "titleField",
                          children: [],
                        },
                      ],
                    },
                    {
                      type: "layer",
                      data: "$data",
                      _type: "UILGraphNodeMenu",
                      refName: "nodemenu",
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        }),
        _this.createState(),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      function detectCopyPaste(event) {
        _this.data.focused &&
          !["input", "textarea"].includes(
            document.activeElement.tagName.toLowerCase(),
          ) &&
          ("c" == event.key &&
            event.metaKey &&
            (_this.set("UIL/ContextMenu", {
              layoutId: _this.params.layoutId,
              targetId: _this.data.id,
              type: UILGraph.LAYER_TYPE,
              isStageLayout: _this.data.isStageLayout,
              fromKeyboard: !0,
            }),
            _this.fire(
              "GraphContextMenu/action",
              UILGraphContextMenu.COPY_LAYER,
            )),
          "v" == event.key &&
            event.metaKey &&
            (_this.set("UIL/ContextMenu", {
              layoutId: _this.params.layoutId,
              targetId: _this.data.id,
              type: UILGraph.LAYER_TYPE,
              isStageLayout: _this.data.isStageLayout,
              fromKeyboard: !0,
            }),
            _this.fire(
              "GraphContextMenu/action",
              UILGraphContextMenu.PASTE_LAYER,
            )),
          ("Delete" != event.key && "Backspace" != event.key) ||
            !event.metaKey ||
            (_this.set("UIL/ContextMenu", {
              layoutId: _this.params.layoutId,
              targetId: _this.data.id,
              type: UILGraph.LAYER_TYPE,
              isStageLayout: _this.data.isStageLayout,
              fromKeyboard: !0,
            }),
            _this.fire("GraphContextMenu/action", UILGraphContextMenu.DELETE)));
      }
      function onKey(event) {
        return "enter" == event.key.toLowerCase()
          ? (function onTitleValidate(event) {
              ((function rename(name) {
                let previousName = _this.data.name;
                (_this.data.set("nameLabel", name),
                  _this.title.text(_this.data.nameLabel),
                  _this.titleField.val(_this.data.nameLabel),
                  _this.events.fire(UILGraphNode.RENAMED, {
                    layoutId: _this.data.layoutId,
                    id: _this.data.id,
                    name: previousName,
                    value: _this.data.nameLabel,
                  }),
                  _this.data.set("name", name),
                  (_this.name = name));
              })(_this.titleField.val()),
                hideTitleEditor());
            })()
          : "escape" == event.key.toLowerCase()
            ? hideTitleEditor()
            : void 0;
      }
      function showTitleEditor() {
        _this.data.special ||
          (_this.titleField.show(),
          _this.titleField.div.focus(),
          _this.titleField.div.select());
      }
      function hideTitleEditor() {
        _this.titleField.hide();
      }
      function openContextMenu(e) {
        (e.preventDefault(),
          _this.set("UIL/ContextMenu", {
            layoutId: _this.params.layoutId,
            targetId: _this.data.id,
            parentId: _this.data.parentId?.split(`sl_${_this.data.scene}_`)[1],
            name: _this.data.name,
            type: _this.data.special
              ? UILGraph.SPECIAL_TYPE
              : UILGraph.LAYER_TYPE,
            isStageLayout: _this.data.isStageLayout,
          }));
      }
      ((_this.data.titleString = _this.data.label || _this.data.name),
        _this.titleField.hide(),
        _this.data.special &&
          (_this.typeIcon.hide(),
          _this.dropTarget.hide(),
          _this.setDragEnabled(!1)),
        _this.data.locked &&
          (_this.wrapper.css({ pointerEvents: "none" }),
          _this.data.special || _this.setDragEnabled(!1)),
        (function addHandlers() {
          (_this.wrapper.div.addEventListener("contextmenu", openContextMenu),
            _this.wrapper.div.addEventListener("dblclick", showTitleEditor, !1),
            _this.titleField.div.addEventListener("keyup", onKey, !1),
            _this.titleField.div.addEventListener("blur", hideTitleEditor, !1),
            document.addEventListener("keydown", detectCopyPaste, !1));
        })(),
        _this.bind(_this.data, "locked", (value) => {
          (_this.wrapper.css({ pointerEvents: value ? "none" : "auto" }),
            _this.data.special || _this.setDragEnabled(!value));
        }),
        (_this.onDrop = function (dropId) {
          _this.fire("UILGraph/MoveNode", {
            moveId: dropId,
            targetId: _this.data.id,
            type: "before",
          });
        }),
        _this.wrapper
          .classList()
          [_this.data.focused ? "add" : "remove"]("focused"),
        _this.bind(_this.data, "focused", (val) => {
          _this.wrapper?.classList()[val ? "add" : "remove"]("focused");
        }),
        "UILGraphLayout" == _this.parent.parent.fragName
          ? _this.line.hide()
          : _this.line
              .size(25, 25)
              .html(UILGraphLayout.LINE_ELBOW)
              .css({ left: 12, top: 2, position: "absolute" }),
        (_this.onMounted = function () {
          (_this.element.div.classList.add("UILGraphNode"),
            _this.header.css({ paddingLeft: 32 * _this.data.depth + "px" }));
        }),
        (_this.onClick = function () {
          _this.fire(
            `UIL/${_this.params.layoutId}/UILGraph/node/focused`,
            _this.data.id,
          );
        }),
        _this._bindOnDestroy(() => {
          document.removeEventListener("keydown", detectCopyPaste, !1);
        }),
        _this.element.goob(
          `\n    position: relative;\n    height: auto;\n    width: 100%;\n    cursor: grab;\n\n    & > .wrapper {\n        width: 100%;\n        border: 1px solid transparent;\n        transition: border-color 200ms, background-color 200ms;\n\n    }\n\n    & > .wrapper:hover {\n        border: 1px solid #1A6DEA;\n    }\n\n    & > .wrapper:active {\n        cursor: grabbing !important;\n    }\n\n    & > .wrapper.focused {\n        background-color: #1A6DEA;\n    }\n\n    & > .wrapper.focused:hover {\n        border: 1px solid transparent;\n    }\n\n    & > .wrapper.dragging {\n        background-color: transparent;\n    }\n\n    & > .wrapper.dragging:hover {\n        border: 1px solid #1A6DEA;\n    }\n\n\n    & > .wrapper.focused.dragging {\n        background-color: transparent;\n    }\n\n    & > .wrapper.focused.dragging:hover {\n        border: 1px solid #1A6DEA;\n    }\n\n    .header {\n        color: var(--color-white);\n        display: flex;\n        flex-direction: row;\n        align-items: center;\n        width: 100%;\n        height: auto;\n        outline: none;\n        padding: 9px;\n        padding-left: 0;\n        box-sizing: border-box;\n        user-select: none;\n        padding-left: 32px;\n    }\n\n    .typeIcon {\n        height: 8px;\n        width: 8px;\n        border: 1px solid var(--color-neutral-90);\n        margin-left: 0 !important;\n        margin-right: 9px;\n    }\n\n    .UILGraphNodeMenu {\n        position: absolute;\n        right: 0;\n    }\n\n    .title {\n        display: block;\n        verticalAlign: middle;\n    }\n\n    .titleField {\n        background-color: #b1b1b1;\n        position: absolute !important;\n        display: inline-block;\n        margin-left: ${28 * ((_this.data.depth || 1) - 1)}px;\n        top: 2px;\n        left: 36px;\n        width: auto !important;\n        padding: 8px !important;\n        verticalAlign: middle;\n        fontWeight: bold;\n        border: 0;\n        outline: none;\n        z-index: 1;\n    }\n\n    & > .wrapper > .dropTarget {\n        margin-left: ${32 * ((_this.data.depth || 1) - 1)}px;\n    }\n\n`,
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
          "UILGraphLayer" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }