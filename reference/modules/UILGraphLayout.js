function UILGraphLayout(_params, ...restArgs) {
      const _this = this;
      (Inherit(_this, Element),
        Inherit(_this, DragAndDrop),
        Inherit(_this, XComponent),
        (_this.fragName = "UILGraphLayout"),
        (_this.contexts = "Element,DragAndDrop"),
        (_this.params = _params),
        (_this.args = arguments),
        (this.isFragment = !0));
      var _promises = [];
      (async function () {
        function createStateArray(array) {
          return new StateArray(array || []);
        }
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
                    tabIndex: 1,
                    _type: "div",
                    refName: "header",
                    children: [
                      { _type: "div", refName: "toggle", children: [] },
                      {
                        _type: "div",
                        _innerText: "$params.name",
                        refName: "title",
                        children: [],
                      },
                    ],
                  },
                  {
                    _type: "div",
                    refName: "children",
                    children: [
                      {
                        _type: "div",
                        refName: "viewstate",
                        children: [
                          {
                            view: "$determineView",
                            data: "$nodes",
                            layoutId: "$id",
                            getBridge: "$getBridge",
                            bridge: "$groupBridge",
                            layoutInstance: "$layoutInstance",
                            _type: "ViewState",
                            refName: "layers",
                            children: [],
                          },
                        ],
                      },
                      {
                        _type: "div",
                        refName: "dropTarget",
                        children: [
                          { _type: "div", refName: "highlight", children: [] },
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
        var _isOpen = !1,
          _isFocused = !1,
          _saveEnabled = !1,
          _isGL = !0 === _this.params.isGL,
          _layoutInstance = _this.params.layoutInstance,
          _isStageLayout = _layoutInstance.isStageLayout;
        function handleParentBinding(node) {
          _this.bind(node, "parent", (val, prevValue) => {
            val
              ? _this.groupBridge.groups.forEach((n) => {
                  n.id.includes(val) &&
                    !n.children.includes(node) &&
                    (n.children.push(node),
                    _this.nodes.remove(node),
                    1 == n.children.length && (node.sortIndex = 0));
                })
              : prevValue &&
                _this.groupBridge.groups.forEach((n) => {
                  n.id.includes(prevValue) &&
                    (n.children.remove(node),
                    _this.nodes.push(node),
                    (node.sortIndex = _this.nodes.length));
                });
          });
        }
        async function duplicateGroup({ targetId: targetId }) {
          if (!targetId) throw new Error("UIL: no targetId in duplicateGroup");
          const targetGroup = _this.groupBridge.groups.find(
            (node) => node.id == targetId,
          );
          if (!targetGroup)
            throw new Error(
              `UIL: no group found in the _this.groupBridge.groups for ${targetId}`,
            );
          const { id: id } = targetGroup,
            groupLayers = [];
          _this.groupBridge.layers.forEach((node) => {
            node.parent === id && groupLayers.push(node);
          });
          const groupDataKeys = UIL.sidebar.toolbar
            .getParentFolder()
            ?.getChildrenControlIds(targetGroup.id);
          UILStorage.duplicateData(
            groupDataKeys,
            _this.groupBridge.groups.length,
          );
          const newGroup = await _this.groupBridge.createGroup({
            groupName: `Copy of ${targetGroup.name}`,
          });
          (handleParentBinding(newGroup),
            _this.nodes.push(newGroup),
            healSort());
          for (let i = 0; i < groupLayers.length; i++) {
            const layer = groupLayers[i];
            await duplicateLayer({ targetId: layer.id, groupId: newGroup.id });
          }
        }
        async function duplicateLayer({
          targetId: targetId,
          groupId: groupId = null,
        }) {
          if (!targetId) throw new Error("UIL: no targetId in duplicateLayer");
          const targetLayer = _this.groupBridge.layers.find(
            (node) => node.id == targetId,
          );
          if (!targetLayer)
            throw new Error(
              `UIL: no layer found in the _this.groupBridge.layers for ${targetId}`,
            );
          const layerDataKeys = UIL.sidebar.toolbar
            .getParentFolder()
            ?.getChildrenControlIds(targetLayer.id);
          UILStorage.duplicateData(
            layerDataKeys,
            _this.groupBridge.layers.length,
          );
          let parent = null,
            layerName = `Copy of ${targetLayer.name}`;
          groupId
            ? ((parent = groupId), (layerName = targetLayer.name))
            : (parent = targetLayer.parent ? targetLayer.parent : null);
          const newNode = await _this.groupBridge.createLayer(parent, {
            layerName: layerName,
          });
          (parent && (newNode.parent = parent),
            handleParentBinding(newNode),
            parent || _this.nodes.push(newNode),
            healSort());
        }
        function copyLayer({ targetId: targetId }) {
          if (!targetId) throw new Error("UIL: no targetId in copyLayer");
          const targetLayer = _this.groupBridge.layers.find(
              (node) => node.id == targetId,
            ),
            parent = targetLayer.parent ? targetLayer.parent : null;
          if (!targetLayer)
            throw new Error(
              `UIL: no layer found in the _this.groupBridge.layers for ${targetId}`,
            );
          const layerDataKeys = UIL.sidebar.toolbar
              .getParentFolder()
              ?.getChildrenControlIds(targetLayer.id),
            copyData = UILStorage.getDataForKeys(layerDataKeys),
            sceneName = _layoutInstance.name;
          navigator.clipboard.writeText(
            JSON.stringify({
              action: "UIL_COPY_LAYER",
              sceneName: sceneName,
              parent: parent,
              name: targetLayer.name,
              layerData: copyData,
            }),
          );
        }
        function copyGroup({ targetId: targetId }) {
          if (!targetId) throw new Error("UIL: no targetId in copyGroup");
          const targetGroup = _this.groupBridge.groups.find(
              (node) => node.id == targetId,
            ),
            { id: id } = targetGroup;
          if (!targetGroup)
            throw new Error(
              `UIL: no group found in the _this.groupBridge.groups for ${targetId}`,
            );
          const groupDataKeys = UIL.sidebar.toolbar
              .getParentFolder()
              ?.getChildrenControlIds(targetGroup.id),
            groupData = UILStorage.getDataForKeys(groupDataKeys),
            sceneName = _layoutInstance.name,
            layersData = [];
          _this.groupBridge.layers.forEach((node) => {
            node.parent == id &&
              layersData.push({
                id: node.id,
                name: node.name,
                sceneName: sceneName,
                layerData: UILStorage.getDataForKeys(
                  UIL.sidebar.toolbar
                    .getParentFolder()
                    ?.getChildrenControlIds(node.id),
                ),
              });
          });
          const copyObject = {
            action: "UIL_COPY_GROUP",
            sceneName: sceneName,
            groupData: {
              id: targetGroup.id,
              data: groupData,
              name: targetGroup.name,
            },
            layersData: layersData,
          };
          navigator.clipboard.writeText(JSON.stringify(copyObject));
        }
        async function pasteLayer({
          parentGroupId: parentGroupId,
          data: data = null,
        }) {
          const copyData =
            data || JSON.parse(await navigator.clipboard.readText());
          if (!data && copyData && "UIL_COPY_LAYER" != copyData.action)
            return void alert(
              "Didnt find any UIL data in your clipboard. Please copy a layer first.",
            );
          const newSceneName = _layoutInstance.name,
            {
              layerData: layerData,
              name: name,
              sceneName: oldSceneName,
            } = copyData,
            copyName = _this.groupBridge.layers.find(
              (node) => node.name == name,
            )
              ? `Copy of ${name}`
              : name;
          layerData.forEach((item) => {
            item.key.endsWith("_name") && (item.value = copyName);
          });
          const parentIndex = layerData.findIndex((item) =>
            item.key.endsWith("_parent"),
          );
          (-1 !== parentIndex && layerData.splice(parentIndex, 1),
            UILStorage.pasteLayerData({
              layerData: layerData,
              newLayerNumber: _this.groupBridge.layers.length,
              sceneName: newSceneName,
              oldSceneName: oldSceneName,
            }));
          const newNode = await _this.groupBridge.createLayer(
            parentGroupId || null,
            { layerName: copyName },
          );
          (parentGroupId && (newNode.parent = parentGroupId),
            handleParentBinding(newNode),
            parentGroupId || _this.nodes.push(newNode),
            healSort());
        }
        async function pasteGroup({ parentGroupId: parentGroupId }) {
          const copyData = JSON.parse(await navigator.clipboard.readText());
          if (copyData && "UIL_COPY_GROUP" != copyData.action)
            return void alert(
              "Didnt find any UIL data in your clipboard. Please copy a group first.",
            );
          _layoutInstance.name;
          const {
              groupData: groupData,
              layersData: layersData,
              sceneName: oldSceneName,
            } = copyData,
            newGroupName = _this.groupBridge.groups.find(
              (node) => node.name == groupData.name,
            )
              ? `Copy of ${groupData.name}`
              : groupData.name,
            newGroup = await _this.groupBridge.createGroup({
              groupName: newGroupName,
            });
          for (let i = 0; i < layersData.length; i++) {
            const layer = layersData[i];
            await pasteLayer({ parentGroupId: newGroup.id, data: layer });
          }
          (parentGroupId && (newGroup.parent = parentGroupId),
            handleParentBinding(newGroup),
            _this.nodes.push(newGroup),
            healSort());
        }
        function deleteLayer({ targetId: targetId }) {
          if (!targetId) throw new Error("UIL: no targetId in deleteLayer");
          const targetLayer = _this.groupBridge.layers.find(
            (node) => node.id == targetId,
          );
          if (!targetLayer)
            throw new Error(
              `UIL: no layer found in the _this.groupBridge.layers for ${targetId}`,
            );
          const additionalKeys = [
              `${targetLayer.firebaseKeyPrefix}_name`,
              `${targetLayer.firebaseKeyPrefix}_sortIndex`,
              `${targetLayer.firebaseKeyPrefix}_renderOrder`,
              `${targetLayer.firebaseKeyPrefix}_parent`,
            ],
            layerDataKeys = UIL.sidebar.toolbar
              .getParentFolder()
              ?.getChildrenControlIds(targetLayer.id);
          let foundNode;
          if (
            (UILStorage.deleteItemsWithKeys([
              ...layerDataKeys,
              ...additionalKeys,
            ]),
            _this.nodes.forEach((node) => {
              node.id == targetId && (foundNode = node);
            }),
            foundNode && !foundNode.parent)
          ) {
            _this.groupBridge.deleteNode(foundNode) &&
              (_this.nodes.remove(foundNode),
              _this.nodes.forEach((node) => {
                node.sortIndex > foundNode.sortIndex && (node.sortIndex -= 1);
              }),
              _this.nodes.length
                ? _this.set(
                    `UIL/${_this.id}/UILGraph/node/focused`,
                    _this.nodes[0].id,
                  )
                : _this.set(`UIL/${_this.id}/UILGraph/node/focused`, null));
          }
          healSort();
        }
        async function deleteGroup({ targetId: targetId }) {
          if (!targetId) throw new Error("UIL: no targetId in deleteGroup");
          const targetGroup = _this.groupBridge.groups.find(
            (node) => node.id == targetId,
          );
          if (!targetGroup)
            throw new Error(
              `UIL: no group found in the _this.groupBridge.groups for ${targetId}`,
            );
          const additionalKeys = [
              `${targetGroup.firebaseKeyPrefix || "INPUT_GROUP"}_name`,
              `${targetGroup.firebaseKeyPrefix}_sortIndex`,
              `${targetGroup.firebaseKeyPrefix}_renderOrder`,
              `${targetGroup.firebaseKeyPrefix}_parent`,
            ],
            groupDataKeys = UIL.sidebar.toolbar
              .getParentFolder()
              ?.getChildrenControlIds(targetGroup.id);
          (UILStorage.deleteItemsWithKeys([
            ...groupDataKeys,
            ...additionalKeys,
          ]),
            _this.groupBridge.deleteNode(targetGroup),
            _this.nodes.remove(targetGroup),
            healSort());
        }
        function addHandlers() {
          (_this.header.div.addEventListener("contextmenu", openContextMenu),
            _this.bind(
              `UIL/${_this.id}/UILGraph/node/focused`,
              handleNodeFocused,
            ),
            _this.listen("GraphContextMenu/action", handleContextMenuAction),
            _this.listen("UILGraph/MoveNode", handleMoveNode),
            _this.events.sub(UILSocket.EDITOR_BRIDGE, onEditorBridgeMessage));
        }
        function handleMoveNode(e) {
          const find = (id) => {
            let found;
            return (
              _this.groupBridge.all.forEach((node) => {
                node.id == id && (found = node);
              }),
              found
            );
          };
          let moveNode = find(e.moveId),
            targetNode = find(e.targetId);
          if (
            moveNode &&
            !(
              (moveNode.parent && moveNode.parent == targetNode?.parent) ||
              moveNode == targetNode ||
              (targetNode?.parent && moveNode.id.includes(targetNode.parent)) ||
              (targetNode?.children && moveNode.children)
            )
          ) {
            if ("end-of-list" == e.type)
              if (targetNode) moveNode.parent = targetNode.id;
              else {
                let oldIndex = moveNode.sortIndex;
                (_this.nodes.forEach((node) => {
                  node.sortIndex > oldIndex && (node.sortIndex -= 1);
                }),
                  (moveNode.sortIndex = _this.nodes.length - 1),
                  (moveNode.parent = null),
                  _this.nodes.sort((a, b) => a.sortIndex - b.sortIndex));
              }
            else {
              if ("group" == moveNode.type && "group" == targetNode?.type)
                return;
              if (targetNode?.parent)
                return (
                  (moveNode.parent = targetNode.parent),
                  _this.fire("UILGraph/MoveNode", e),
                  void healSort()
                );
              moveNode.parent = null;
              let oldIndex = moveNode.sortIndex;
              if (
                (_this.nodes.forEach((node) => {
                  node.sortIndex > oldIndex && (node.sortIndex -= 1);
                }),
                "before" == e.type)
              ) {
                let newIndex = targetNode.sortIndex;
                (_this.nodes.forEach((node) => {
                  node.sortIndex >= newIndex && (node.sortIndex += 1);
                }),
                  (moveNode.sortIndex = newIndex));
              }
              _this.nodes.sort((a, b) => a.sortIndex - b.sortIndex);
            }
            (healSort(),
              _this.set(`UIL/${_this.id}/UILGraph/node/focused`, e.moveId));
          }
        }
        function healSort() {
          let lastIndex = -1;
          _this.nodes.forEach((node) => {
            let delta = node.sortIndex - lastIndex;
            (delta > 1 && (node.sortIndex -= delta - 1),
              (lastIndex = node.sortIndex));
          });
        }
        async function onEditorBridgeMessage(e) {
          if (e.layout && e.layout === _this.name) {
            if ("create" == e.action) {
              let layer = await _layoutInstance._createLayer(null);
              (await _this.wait(100),
                _this.events.fire(UILGraphLayout.BRIDGE_CREATE, {
                  layoutName: _layoutInstance.name,
                  layerName: layer._sceneLayout.name,
                  newName: e.layerName,
                }));
            }
            if ("delete" == e.action) {
              let node = find(e.layerName);
              _layoutInstance._deleteLayer(node.id, e.layerName, !0) &&
                _this.remove(node, !0);
            }
            if ("eval" == e.action) {
              let layer = await _layoutInstance.getLayer(e.layerName);
              eval("layer._sceneLayout." + e.code);
            }
          }
        }
        function openContextMenu(e) {
          (e.preventDefault(),
            _this.set("UIL/ContextMenu", {
              layoutId: _this.id,
              targetId: _this.id,
              type: _isStageLayout
                ? UILGraph.STAGE_LAYOUT_TYPE
                : UILGraph.LAYOUT_TYPE,
              isStageLayout: _isStageLayout,
            }));
        }
        async function handleContextMenuAction(event) {
          const context = _this.get("UIL/ContextMenu");
          if (context && context.layoutId == _this.id)
            switch (event) {
              case UILGraphContextMenu.DELETE:
                _this.groupBridge.groups.find(
                  (node) => node.id == context.targetId,
                )
                  ? deleteGroup({ targetId: context.targetId })
                  : deleteLayer({ targetId: context.targetId });
                break;
              case UILGraphContextMenu.ADD_LAYER:
                {
                  const parent =
                    context.targetId && context.targetId !== _this.id
                      ? _this.groupBridge.groups.find(
                          (node) => node.id == context.targetId,
                        )
                      : null;
                  _this.groupBridge.createLayer();
                  let newNode =
                    _this.groupBridge.layers[
                      _this.groupBridge.layers.length - 1
                    ];
                  (handleParentBinding(newNode),
                    _this.nodes.push(newNode),
                    healSort(),
                    parent && (newNode.parent = parent.id));
                }
                break;
              case UILGraphContextMenu.ADD_GROUP:
                {
                  _this.groupBridge.createGroup();
                  let newNode =
                    _this.groupBridge.groups[
                      _this.groupBridge.groups.length - 1
                    ];
                  (handleParentBinding(newNode),
                    _this.nodes.push(newNode),
                    healSort());
                }
                break;
              case UILGraphContextMenu.COPY_GROUP:
                copyGroup({ targetId: context.targetId });
                break;
              case UILGraphContextMenu.COPY_LAYER:
                copyLayer({ targetId: context.targetId });
                break;
              case UILGraphContextMenu.COPY_LAYOUT:
                var dataToCopy = {
                  UIL_ID: window.UIL_ID,
                  layout: context.layoutId,
                  location: window.location.pathname
                    .split("/")
                    .filter(Boolean)[0],
                };
                if (window.Platform && Router) {
                  const world = await Platform.getRoute(
                    Router.getStateString(),
                  );
                  dataToCopy.world = world;
                }
                navigator.clipboard.writeText(JSON.stringify(dataToCopy));
                break;
              case UILGraphContextMenu.DUPLICATE_LAYER:
                duplicateLayer({
                  targetId: context.targetId,
                  parentId: context.parentId,
                });
                break;
              case UILGraphContextMenu.DUPLICATE_GROUP:
                duplicateGroup({
                  targetId: context.targetId,
                  parentId: context.parentId,
                });
                break;
              case UILGraphContextMenu.CINEMA:
                applyCinemaConfig();
                break;
              case UILGraphContextMenu.FIGMA:
                applyFigmaConfig();
                break;
              case UILGraphContextMenu.PASTE_LAYER:
                let parentId = null;
                (context.name &&
                  context.name.startsWith("group_") &&
                  (parentId = context.name),
                  pasteLayer({ parentGroupId: parentId }));
                break;
              case UILGraphContextMenu.PASTE_GROUP:
                let parentGroupId = null;
                (context.name &&
                  context.name.startsWith("group_") &&
                  (parentGroupId = context.name),
                  pasteGroup({ parentGroupId: parentGroupId }));
                break;
              case UILGraphContextMenu.PASTE_LAYOUT:
                return alert(
                  "The Paste Layout feature is not yet implemented.",
                );
            }
        }
        function handleNodeFocused(val) {
          let focusedNode;
          if (!val || !_this.nodes.length)
            return (
              _this.set("UILGraphLayoutFocused", "xxxxx"),
              UIL.sidebar.toolbar.filterSingle("xxxxx"),
              void _this.events.fire(UILGraphNode.FOCUSED, {
                name: "Config",
                layoutInstance: _layoutInstance,
              })
            );
          (_this.nodes.forEach((node) => {
            ((node.focused = val == node.id),
              node.focused && (focusedNode = node));
          }),
            focusedNode &&
              (UIL.sidebar.toolbar.filterSingle(val),
              Storage.set(`UIL:${_this.id}/Graph/focused`, val),
              Storage.set("UILGraphLayoutFocused", _this.id),
              _this.set("UILGraphLayoutFocused", _this.id),
              _this.events.fire(UILGraphNode.FOCUSED, {
                name: focusedNode.name,
                layoutInstance: _layoutInstance,
              })));
        }
        ((_this.id =
          _this.params.id ||
          `${_this.params.name.toLowerCase()}-${_this.params.uniq}`),
          (_this.layoutInstance = _layoutInstance),
          (_this.attachmentId = `${_this.params.name}-${_this.params.uniq}`),
          (_this.addSpecial =
            _this.addLayer =
            _this.addGroup =
            _this.syncVisibility =
            _this.syncGroupNames =
            _this.open =
              (_) => {}),
          (_this.getBridge = () => _this.groupBridge),
          (_this.groupBridge = await UILGroupBridge.createSceneLayout(
            _layoutInstance.name,
          )),
          (_this.determineView = (data) =>
            "group" == data.type ? UILGraphGroup : UILGraphLayer),
          _this.setDragEnabled(!1),
          (_this.nodes = createStateArray()),
          _this.groupBridge.all.forEach((node) => {
            (handleParentBinding(node), node.parent || _this.nodes.push(node));
          }),
          addHandlers(),
          _this.delayedCall((_) => {
            Storage.get("UILGraphLayoutFocused") == _this.id &&
              _this.set(
                `UIL/${_this.id}/UILGraph/node/focused`,
                Storage.get(`UIL:${_this.id}/Graph/focused`),
              );
          }, 500),
          (_this.onDrop = function (dropId) {
            _this.fire("UILGraph/MoveNode", {
              moveId: dropId,
              targetId: null,
              type: "end-of-list",
            });
          }),
          _this.bind("UILGraphLayoutFocused", (id) => {
            id != _this.id &&
              _this.groupBridge.all.forEach((node) => {
                node.focused = !1;
              });
          }),
          _this.element.goob(
            "\n    & {\n        position: relative;\n        width: 100%;\n        height: auto;\n        font-family: sans-serif;\n        font-size: 11px;\n    }\n\n    & > .wrapper {\n        background-color: #161616;\n    }\n\n    .header {\n        width: 100%;\n        height: auto;\n        outline: none;\n        display: block;\n        padding: 4px;\n        box-sizing: border-box;\n        user-select: none;\n    }\n\n    .toggle {\n        position: relative;\n        width: 2px;\n        height: 2px;\n        fontSize: 9ps;\n        text-align: center;\n        display: inline-block;\n        vertical-align: middle;\n        border: 1px solid #b1b1b1;\n        border-radius: 50%;\n        margin-left: 2px;\n    }\n\n    .title {\n        display: inline-block;\n        vertical-align: middle;\n        marginLeft: 6px;\n    }\n\n    .children {\n        overflow: hidden;\n        transition: filter 0.1s linear;\n        filter: brightness(0.8);\n    }\n    .children:hover {\n        filter: brightness(1.0);\n    }\n\n    .lastPseudoLayer {\n        height: 8px;\n    }\n\n    .dropTarget {\n        position: relative;\n        height: 15px;\n        width: 100%;\n        margin-bottom: -15px;\n    }\n\n    .dropTarget .highlight {\n        width: 100%;\n        height: 6px;\n        background: #1A6DEA;\n        opacity: 0;\n        transition: opacity 200ms;\n    }\n\n    .dropTarget.hover .highlight{\n        opacity: 1;\n    }\n\n    & > .wrapper > .children > .dropTarget {\n        margin-bottom: 0;\n    }\n\n    .iconButton {\n        width: 16px;\n        height: 16px;\n        cursor: pointer;\n        transition: opacity 200ms;\n        stroke: var(--color-white);\n        fill: var(--color-white);\n        opacity: 0.6;\n        margin: 2px;\n    }\n    \n    .iconButton rect {\n        fill: var(--color-white);\n    }\n    \n    .iconButton:hover {\n        opacity: 1;\n    }\n",
          ),
          (_this.onDestroy = (_) => {
            _this.fire("UILGraphLayout/destroy", _this.attachmentId);
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
            "UILGraphLayout" !== _this.fragName ||
            !_this.onInit ||
            _this.onInit.calledInit ||
            (onInit = _this.onInit),
          onInit &&
            (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
      })();
    }