function UILControlImage(_params, ...restArgs) {
      const _this = this;
      (Inherit(_this, UILControl),
        Inherit(_this, XComponent),
        (_this.fragName = "UILControlImage"),
        (_this.contexts = "UILControl"),
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
                className: "form-group",
                _type: "div",
                refName: "unnamed",
                children: [
                  {
                    htmlFor: "image",
                    _type: "label",
                    _innerText: "$state.label",
                    refName: "unnamed",
                    children: [],
                  },
                  {
                    type: "text",
                    className: "path",
                    _type: "input",
                    refName: "input",
                    children: [],
                  },
                ],
              },
              {
                className: "wrapper",
                _type: "div",
                refName: "unnamed",
                children: [
                  {
                    className: "upload-message",
                    _type: "div",
                    refName: "uploadMessage",
                    children: [],
                  },
                  {
                    className: "preview",
                    _type: "div",
                    refName: "unnamed",
                    children: [
                      { _type: "div", refName: "img", children: [] },
                      {
                        className: "picker",
                        type: "file",
                        id: "imageFile",
                        multiple: !0,
                        accept: "image/*",
                        _type: "input",
                        refName: "picker",
                        children: [],
                      },
                      {
                        className: "progress",
                        _type: "div",
                        refName: "unnamed",
                        children: [],
                      },
                      {
                        className: "delete small",
                        _type: "button",
                        refName: "delete",
                        children: [
                          {
                            width: 10,
                            height: 10,
                            viewBox: "0 0 10 10",
                            fill: "none",
                            stroke: "currentColor",
                            xmlns: "http://www.w3.org/2000/svg",
                            _type: "svg",
                            refName: "unnamed",
                            children: [
                              {
                                "stroke-width": 2,
                                strokeLinecap: "round",
                                d: "M2 2l6 6M2 8l6-6",
                                _type: "path",
                                refName: "unnamed",
                                children: [],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        className: "copy",
                        _type: "div",
                        _innerText: "Drag and drop your file here",
                        refName: "unnamed",
                        children: [],
                      },
                    ],
                  },
                  {
                    className: "preview-controls",
                    _type: "div",
                    refName: "unnamed",
                    children: [
                      {
                        className: "control-button small",
                        _type: "button",
                        _innerText: "Browse Assets",
                        refName: "browseButton",
                        children: [],
                      },
                      {
                        className: "control-button small",
                        _type: "button",
                        _innerText: "Compress",
                        refName: "compress",
                        children: [],
                      },
                      {
                        className: "checkbox-control",
                        htmlFor: "$state.compressedInput",
                        _type: "label",
                        refName: "unnamed",
                        children: [
                          {
                            className: "regular-checkbox",
                            type: "checkbox",
                            name: "$state.compressedInput",
                            id: "$state.compressedInput",
                            _type: "input",
                            refName: "check",
                            children: [],
                          },
                          {
                            _type: "span",
                            _innerText: "Use Compressed",
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
        async function remoteFileSelected(id) {
          const asset = await UILRemote.getAsset(id),
            v = {
              compressed: !1,
              filename: asset.name,
              prefix: asset.url.split("/").slice(0, -1).join("/"),
              relative: "",
              src: asset.url,
            };
          (_this.force(v, !0), _this.finish());
        }
        function textureUpdate(e) {
          e.file?.split("?")[0] == _this.value.src &&
            _this.img.css({
              backgroundImage: `url(${e.file.split("-compress")[0]})`,
            });
        }
        async function compressKtx2() {
          let result,
            options,
            output,
            src,
            path = _this.value.src.split("?")[0];
          if (_this.params.options.compressOptions?.cube)
            (_this.compress.bg("#fdb460").html("Cubemap"),
              ([output, src] = (function parseCubePaths(path) {
                let info = Utils3D.splitCubemapPath(path),
                  src = Utils3D.getCubemapFacePaths(info);
                return [`${info.prefix}.ktx2`, src];
              })(path)),
              (options = ["--genmipmap", "--encode", "etc1s", "--cubemap"]));
          else {
            let noext = (function removeImageExtension(filename) {
              const lastDotIndex = filename.lastIndexOf(".");
              return -1 !== lastDotIndex
                ? filename.substring(0, lastDotIndex)
                : filename;
            })(path.split("/").last());
            ((options = ["--genmipmap", "--encode", "etc1s"]),
              (output = `${(function getFolderPath(url) {
                return (
                  (url = url.split("/")).last().includes(".") && url.pop(),
                  url.join("/")
                );
              })(path)}/${noext}.ktx2`),
              (src = [path]));
          }
          let params = { options: options, src: src },
            isLocal = !/^https?:\/\//.test(src);
          if (
            (isLocal && (params.output = output),
            (result = await Dev.execUILScript("compressktx2", params)),
            "Error" !== result && !isLocal)
          ) {
            if (!result.output.startsWith("data:image/ktx2;base64,")) return !1;
            let blob = await (await fetch(result.output)).blob();
            blob.name = output.split("/").last();
            await UILStorage.uploadAsset(blob);
            return !0;
          }
        }
        async function compressClick() {
          if (!_this.value.src || _this.flag("compressPending")) return;
          (_this.flag("compressPending", !0),
            _this.compress.bg("#f4ee42").text("---"));
          let success = !1;
          try {
            success = await compressKtx2();
          } catch (e) {
            console.error(e);
          }
          (success
            ? _this.compress.bg("#46f441").html("Success")
            : _this.compress.bg("#f44141").html("Failed"),
            _this.flag("compressPending", !1),
            _this.finish());
        }
        async function checkChange() {
          let compressed = !!_this.check.div.checked && "ktx2";
          ((_this.value.compressed = compressed),
            (_this.value.useCompressed = !!compressed),
            _this.finish());
        }
        async function change(e) {
          let file = e.dataTransfer?.files[0] || _this.picker.div.files[0];
          if (!file) return;
          if (Utils.query("noRemote")) {
            let name = file.name;
            ((_this.value.filename = name),
              (_this.value.relative = (function getRelative() {
                return _this.value.filename.includes("http")
                  ? ""
                  : _this.value.relative.includes(_this.value.prefix)
                    ? _this.value.relative.replace(`${_this.value.prefix}`, "")
                    : _this.value.relative;
              })()),
              (_this.value.src = (function getSrc() {
                return _this.value.filename.includes("http")
                  ? _this.value.filename
                  : `${_this.value.prefix ? _this.value.prefix + "/" : ""}${_this.value.relative ? _this.value.relative + "/" : ""}${_this.value.filename}`;
              })()),
              (_this.value.compressed = !!_this.check.div.checked),
              (_this.value.useCompressed = _this.value.compressed),
              (_this.value.prefix = "assets/images/"));
            let compressed = !!_this.check.div.checked && "ktx2";
            return (
              (_this.value.compressed = compressed),
              (_this.value.useCompressed = !!compressed),
              void ((await (function imageExists(url) {
                return (
                  !!url.includes("http") ||
                  ((url = Assets.getPath(url)),
                  fetch(url)
                    .then((e) => 404 != e.status)
                    .catch((e) =>
                      console.warn(
                        "UILControlImage image url validation failed",
                        e,
                      ),
                    ))
                );
              })(_this.value.src))
                ? ((_this.value = Object.assign({}, _this.value)),
                  (_this.picker.div.value = ""),
                  _this.picker.attr("title", _this.value.src),
                  _this.img.css({
                    backgroundImage: `url(${Assets.getPath(_this.value.src)})`,
                  }),
                  _this.delete.show(),
                  _this.finish())
                : ((_this.picker.div.value = ""),
                  console.warn("UIL: Could not find image", _this.value),
                  alert(
                    `"${_this.value.src}" not found!\nMake sure "relative path" is correct.`,
                  )))
            );
          }
          (_this.uploadMessage.text("Uploading file(s) to remote"),
            _this.uploadMessage.classList().add("active"));
          const asset = await UILStorage.uploadAsset(file);
          (asset
            ? _this.uploadMessage.text(
                "Success! Uploaded file to remote ",
                asset,
              )
            : _this.uploadMessage.text(
                "Failed to upload file to remote ",
                asset,
              ),
            _this.delayedCall((_) => {
              _this.uploadMessage.classList().remove("active");
            }, 4e3),
            (_this.value.compressed = !1),
            (_this.value.filename = asset.name),
            (_this.value.prefix = asset.url.split("/").slice(0, -1).join("/")),
            (_this.value.relative = ""),
            (_this.value.src = asset.url),
            (_this.picker.div.value = ""),
            _this.picker.attr("title", _this.value.src),
            _this.img.css({ backgroundImage: `url(${_this.value.src})` }),
            _this.delete.show(),
            _this.finish());
        }
        function deleteImage() {
          ((_this.value = {
            src: "",
            relative: "",
            prefix: "assets/images",
            filename: "",
            useCompressed: !1,
          }),
            (_this.input.div.value = ""),
            (_this.picker.div.value = ""),
            _this.picker.attr("title", null),
            _this.img.css({ backgroundImage: "" }),
            _this.delete.hide(),
            (_this.value = Object.assign({}, _this.value)),
            _this.finish());
        }
        async function openAssetsExplorer() {
          UIL.assetsExplorer.open(remoteFileSelected);
        }
        function inputChange() {
          ((_this.value.relative = _this.input.div.value),
            _this.input.val().includes(["assets/"]) &&
              ((_this.value = {
                src: _this.input.val(),
                relative: _this.input.val(),
                prefix: "",
                filename: _this.input.val(),
              }),
              _this.finish()));
        }
        ((_this.params = Object.assign(
          {},
          { id: _this.params },
          { options: restArgs[0] },
        )),
          _this.state.set("id", _this.params.id),
          _this.state.set("compressedInput", `${_this.params.id}-compressed`),
          (_this.params.options.value = Object.assign(
            {
              src: "",
              relative: _this.params.options.relative || "",
              prefix: _this.params.options.prefix,
              filename: "",
              useCompressed: !1,
            },
            _this.params.options.value,
          )),
          (_this.value = Object.assign({}, _this.params.options.value)),
          _this.init(_this.params.id, _this.params.options),
          (_this.check.div.checked = _this.params.options.value.useCompressed),
          _this.value.relative
            ? (_this.input.div.value = _this.value.relative)
            : _this.input.attr("placeholder", "Relative Path"),
          _this.delete.hide(),
          _this.value.src &&
            _this.img.css({
              backgroundImage: `url('${Assets.getPath(_this.value.src)}')`,
            }),
          (function initListeners() {
            (_this.picker.div.addEventListener("change", change, !1),
              _this.input.div.addEventListener("change", inputChange, !1),
              (_this.delete.div.onclick = deleteImage),
              (_this.compress.div.onclick = compressClick),
              (_this.check.div.onchange = checkChange),
              _this.browseButton.click(openAssetsExplorer),
              _this.events.sub(ShaderUIL.TEXTURE_UPDATE, textureUpdate));
          })(),
          (_this.force = async function (value, isClipboard) {
            ((_this.value = Object.assign({}, value)),
              (_this.input.div.value = _this.value.filename),
              (_this.picker.div.value = ""),
              _this.picker.attr("title", _this.value.src),
              _this.img.css({
                backgroundImage: `url('${Assets.getPath(_this.value.src)}')`,
              }),
              (_this.check.div.checked = _this.value.compressed));
            let compressed = !!_this.check.div.checked && "ktx2";
            ((_this.value.compressed = compressed),
              (_this.value.useCompressed = !!compressed),
              _this.delete.show());
          }),
          (_this.onDestroy = function () {
            (_this.picker.div.removeEventListener("change", change, !1),
              _this.input.div.removeEventListener("change", inputChange, !1));
          }),
          _this.element.goob(
            "\n    & {}\n\n    .form-group {\n        margin-bottom: var(--spacing-small);\n    }\n\n    .picker {\n        &:focus {\n            .img {\n                border-color: var(--color-accent-80);\n            }\n        }\n    }\n\n    .wrapper {\n        display: flex;\n        gap: var(--spacing-small);\n    }\n\n    .upload-message {\n        position: absolute;\n        padding: 12px;\n        max-width: 54%;\n        text-align: center;\n        background: black;\n        margin-top: 34px;\n        opacity: 0;\n        transition: opacity 200ms ease-out;\n        z-index: 1;\n\n        &.active {\n            opacity: 1;\n        }\n    }\n\n    .preview {\n        width: 160px;\n        height: 128px;\n        box-sizing: border-box;\n        position: relative;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        overflow: hidden;\n        flex-shrink: 0;\n\n        &:has(.img[style*='url']) {\n            &:hover {\n                .delete {\n                    opacity: 1;\n                }\n            }\n        }\n    }\n\n    .img {\n        width: 100%;\n        height: 100%;\n        position: absolute;\n        inset: 0px;\n        background-size: cover;\n        background-repeat: no-repeat;\n        background-position: center center;\n        border: 1px dotted var(--color-neutral-40);\n        text-align: center;\n    }\n\n    .picker {\n        position: absolute;\n        opacity: 0;\n        inset: 0px;\n    }\n\n    .progress {\n        position: absolute;\n        bottom: 0px;\n        height: 10px;\n        left: 0px;\n        background: rgb(155, 156, 155);\n    }\n\n    .copy {\n        color: var(--color-neutral-80);\n        font: var(--label2);\n        padding: var(--spacing-small);\n        text-align: center;\n    }\n\n    .control-button {\n        margin-bottom: calc(var(--spacing-small) / 2);\n        width: 100%;\n    }\n\n    .delete {\n        display: flex;\n        justify-content: center;\n        align-items: center;\n        width: 22px;\n        height: 22px;\n        padding: 0 !important;\n        position: absolute;\n        top: var(--spacing);\n        right: var(--spacing);\n        z-index: 100;\n        opacity: 0;\n    }\n",
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
            "UILControlImage" !== _this.fragName ||
            !_this.onInit ||
            _this.onInit.calledInit ||
            (onInit = _this.onInit),
          onInit &&
            (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
      })();
    }