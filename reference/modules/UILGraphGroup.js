function UILGraphGroup(_data, _index, _params) {
    const _this = this;
    (Inherit(_this, ViewStateElement),
      Inherit(_this, Element),
      Inherit(_this, DragAndDrop),
      Inherit(_this, XComponent),
      (_this.fragName = "UILGraphGroup"),
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
              _type: "div",
              refName: "wrapper",
              children: [
                {
                  _type: "div",
                  refName: "hitArea",
                  children: [
                    {
                      _type: "div",
                      refName: "dropTarget",
                      children: [
                        { _type: "div", refName: "highlight", children: [] },
                      ],
                    },
                    {
                      click: "$onClick",
                      _type: "div",
                      refName: "header",
                      children: [
                        {
                          click: "$toggleClick",
                          _type: "div",
                          refName: "toggleButton",
                          children: [],
                        },
                        { _type: "div", refName: "typeIcon", children: [] },
                        {
                          tabIndex: 1,
                          _type: "div",
                          refName: "title",
                          children: [
                            {
                              _type: "div",
                              _innerText: "$data.name",
                              refName: "titleText",
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
                          type: "group",
                          data: "$data",
                          layoutId: "$params.layoutId",
                          _type: "UILGraphNodeMenu",
                          refName: "unnamed",
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  data: "$data",
                  layoutId: "$params.layoutId",
                  _type: "UILGraphGroupChildren",
                  refName: "unnamed",
                  children: [],
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
              type: UILGraph.GROUP_TYPE,
              isStageLayout: _this.data.isStageLayout,
              fromKeyboard: !0,
            }),
            _this.fire(
              "GraphContextMenu/action",
              UILGraphContextMenu.COPY_GROUP,
            )),
          "v" == event.key &&
            event.metaKey &&
            (_this.set("UIL/ContextMenu", {
              layoutId: _this.params.layoutId,
              targetId: _this.data.id,
              type: UILGraph.GROUP_TYPE,
              isStageLayout: _this.data.isStageLayout,
              fromKeyboard: !0,
            }),
            _this.fire(
              "GraphContextMenu/action",
              UILGraphContextMenu.PASTE_GROUP,
            )),
          ("Delete" != event.key && "Backspace" != event.key) ||
            !event.metaKey ||
            (_this.set("UIL/ContextMenu", {
              layoutId: _this.params.layoutId,
              targetId: _this.data.id,
              type: UILGraph.GROUP_TYPE,
              isStageLayout: _this.data.isStageLayout,
              fromKeyboard: !0,
            }),
            _this.fire("GraphContextMenu/action", UILGraphContextMenu.DELETE)));
      }
      function handleNodeFocused(val) {
        if (!_this.data) return;
        let focusedNode;
        (_this.data.children?.forEach((node) => {
          ((node.focused = val == node.id),
            node.focused && (focusedNode = node));
        }),
          focusedNode &&
            (UIL.sidebar.toolbar.filterSingle(val),
            Storage.set(`UIL:${_this.params.layoutId}/Graph/focused`, val),
            _this.events.fire(UILGraphNode.FOCUSED, {
              name: focusedNode.name,
              layoutInstance: _this.params.layoutInstance,
            })));
      }
      function handleMoveNode(e) {
        if (!_this.data || !_this.data.children) return;
        const find = (id) => {
          let found;
          return (
            _this.data.children.forEach((node) => {
              node.id == id && (found = node);
            }),
            found
          );
        };
        let moveNode = find(e.moveId),
          targetNode = find(e.targetId);
        try {
          if (!moveNode.parent || moveNode.parent != targetNode?.parent) return;
        } catch (e) {
          return;
        }
        if (
          (1 == _this.data.children.length && (moveNode.sortIndex = 0),
          "end-of-list" == e.type)
        ) {
          let oldIndex = moveNode.sortIndex;
          (_this.data.children.forEach((node) => {
            node.parent || (node.sortIndex > oldIndex && (node.sortIndex -= 1));
          }),
            (moveNode.sortIndex = _this.data.children.length - 1),
            _this.data.children.sort((a, b) => a.sortIndex - b.sortIndex));
        } else {
          let oldIndex = moveNode.sortIndex;
          if (
            (_this.data.children.forEach((node) => {
              node.sortIndex > oldIndex && (node.sortIndex -= 1);
            }),
            "before" == e.type)
          ) {
            let newIndex = targetNode.sortIndex;
            (_this.data.children.forEach((node) => {
              node.sortIndex >= newIndex && (node.sortIndex += 1);
            }),
              (moveNode.sortIndex = newIndex));
          }
          (_this.data.children.sort((a, b) => a.sortIndex - b.sortIndex),
            healSort());
        }
      }
      function healSort() {
        let lastIndex = -1;
        _this.data.children.forEach((node) => {
          let delta = node.sortIndex - lastIndex;
          (delta > 1 && (node.sortIndex -= delta - 1),
            (lastIndex = node.sortIndex));
        });
      }
      async function handleContextMenuAction(event) {
        if (!_this.get) return;
        const context = _this.get("UIL/ContextMenu");
        if (
          context &&
          context.layoutId == _this.params.layoutId &&
          event === UILGraphContextMenu.DELETE
        ) {
          let foundNode;
          if (
            (_this.data.children.forEach((node) => {
              node.id == context.targetId && (foundNode = node);
            }),
            foundNode)
          ) {
            _this.params.getBridge().deleteNode(foundNode) &&
              (_this.data.children.remove(foundNode),
              _this.data.children.forEach((node) => {
                node.sortIndex > foundNode.sortIndex && (node.sortIndex -= 1);
              }),
              _this.set(
                `UIL/${_this.params.layoutId}/UILGraph/node/focused`,
                _this.data.id,
              ));
          }
          healSort();
        }
      }
      function onKey(event) {
        return "enter" == event.key.toLowerCase()
          ? (function onTitleValidate(event) {
              ((function rename(name) {
                let previousName = _this.data.nameLabel;
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
            parentId: _this.data.parentId?.split(`${_this.data.scene}_`)[1],
            name: _this.data.name,
            type: UILGraph.GROUP_TYPE,
            isStageLayout: _this.data.isStageLayout,
          }));
      }
      ((_this.id = _this.data.id),
        (_this.name = _this.data.name),
        (_this.nameLabel = _this.data.name),
        (_this.isGraphGroup = !0),
        (_this.sortOrder = _this.params.order),
        _this.typeIcon.html(UILGraphLayout.GROUP_ICON),
        _this.toggleButton.html(UILGraphLayout.ARROW_ICON),
        _this.toggleButton
          .classList()
          [_this.data.open ? "remove" : "add"]("closed"),
        _this.titleField.hide(),
        (_this.onClick = function (e) {
          e.target.getAttribute("class")?.indexOf("toggleButton") > -1 ||
            e.target.getAttribute("class")?.indexOf("arrow") > -1 ||
            _this.fire(
              `UIL/${_this.params.layoutId}/UILGraph/node/focused`,
              _this.data.id,
            );
        }),
        _this.data.set("open", !0),
        (_this.toggleClick = (_) => {
          (_this.data.set("open", !_this.data.open),
            _this.fire("UILGraphGroup/open", {
              open: _this.data.open,
              id: _this.data.id,
              layoutId: _this.data.layoutId,
            }));
        }),
        _this.bind(_this.data, "open", (val) =>
          _this.toggleButton?.classList?.()[val ? "remove" : "add"]("closed"),
        ),
        _this.bind(_this.data, "locked", (value) => {
          (_this.wrapper.css({ pointerEvents: value ? "none" : "auto" }),
            _this.setDragEnabled(!value));
        }),
        (function addHandlers() {
          (_this.hitArea.div.addEventListener("contextmenu", openContextMenu),
            _this.element.div.addEventListener(
              "mousedown",
              _this.addDragListeners,
              !1,
            ),
            window.addEventListener("mouseup", _this.removeDragListeners, !1),
            _this.hitArea.div.addEventListener("dblclick", showTitleEditor, !1),
            _this.titleField.div.addEventListener("keyup", onKey, !1),
            _this.titleField.div.addEventListener("blur", hideTitleEditor, !1),
            _this.bind(
              `UIL/${_this.params.layoutId}/UILGraph/node/focused`,
              handleNodeFocused,
            ),
            _this.listen("UILGraph/MoveNode", handleMoveNode),
            _this.listen("GraphContextMenu/action", handleContextMenuAction),
            document.addEventListener("keydown", detectCopyPaste, !1));
        })(),
        _this.header
          .classList()
          [_this.data.selected ? "add" : "remove"]("focused"),
        _this.bind(_this.data, "focused", (val) => {
          if (!_this.header) return;
          const focusedAction = val ? "add" : "remove";
          _this.header.classList()[focusedAction]("focused");
        }),
        (_this.onMounted = function () {
          (_this.element.div.classList.add("UILGraphNode"),
            _this.header.css({ paddingLeft: 32 * _this.data.depth + "px" }),
            _this.setDragElement(_this.header),
            _this.data.locked &&
              (_this.wrapper.css({ pointerEvents: "none" }),
              _this.data.special || _this.setDragEnabled(!1)));
        }),
        (_this.onDrop = function (dropId) {
          _this.fire("UILGraph/MoveNode", {
            moveId: dropId,
            targetId: _this.data.id,
            type: "before",
          });
        }),
        _this._bindOnDestroy(() => {
          document.removeEventListener("keydown", detectCopyPaste, !1);
        }),
        _this.element.goob(
          `\n    position: relative;\n    width: 300px;\n    height: auto;\n    font-family: sans-serif;\n    font-size: 11px;\n    width: 100%;\n    cursor: grab;\n\n    & > .wrapper > .hitArea > .header {\n        width: 100%;\n        height: auto;\n        outline: none;\n        display: flex;\n        flex-direction: row;\n        align-items: center;\n        padding: 9px;\n        padding-left: 32px;\n        box-sizing: border-box;\n        user-select: none;\n        border: 1px solid rgba(26, 109, 234, 0);\n    }\n\n    & > .wrapper > .hitArea > .header {\n        transition: border-color 200ms, background-color 200ms;\n    }\n\n    & > .wrapper > .hitArea > .header:hover {\n        border: 1px solid rgba(26, 109, 234, 1);\n    }\n\n\n    & > .wrapper > .hitArea > .header.focused {\n        background-color: rgba(26, 109, 234, 1);\n    }\n\n    & > .wrapper > .hitArea > .header.focused:hover {\n        border: 1px solid rgba(26, 109, 234, 0);\n    }\n\n    .toggleButton {\n        position: absolute;\n        width: 32px;\n        height: auto;\n        box-sizing: border-box;\n        text-align: center;\n        padding: 9px;\n        margin-left: -32px;\n        transform: rotate(180deg);\n        opacity: 0.6;\n        transition: opacity 200ms;\n    }\n\n    .toggleButton:hover {\n        opacity: 1;\n    }\n\n    .toggleButton.closed {\n        transform: rotate(0deg);\n    }\n\n    .toggleButton path {\n        fill: var(--color-white);\n    }\n\n    .typeIcon {\n        margin-right: 9px;\n        margin-left: -4px;\n    }\n\n    .typeIcon path {\n        fill: var(--color-white);\n    }\n\n    .typeIcon rect {\n        stroke: var(--color-white);\n    }\n\n    .title {\n        display: block;\n        verticalAlign: middle;\n    }\n\n    .titleField {\n        background-color: #b1b1b1;\n        position: absolute !important;\n        display: inline-block;\n        margin-left: ${30 * (_this.data.depth - 1)}px;\n        top: 4px;\n        left: 32px;\n        width: auto !important;\n        padding: 9px !important;\n        verticalAlign: middle;\n        fontWeight: bold;\n        border: 0;\n        outline: none;\n        z-index: 1;\n    }\n\n    .UILGraphNodeMenu {\n        position: absolute;\n        right: 0;\n    }\n\n    .visibilityButton {\n    }\n\n    .UILGraphGroupChildren {\n        overflow: hidden;\n        margin-top: -4px;\n    }\n\n`,
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
          "UILGraphGroup" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }