function Main() {
    let pristineContextLoss = !0;
    function onContextLoss() {
      pristineContextLoss &&
        ((pristineContextLoss = !1), console.warn("context loss"));
    }
    !(function () {
      if (Utils.query("performance")) return Performance.displayResults();
      !(function init() {
        window._PROJECT_NAME_ &&
          ((Dev.pathName = `/${window._PROJECT_NAME_}/HTML/`),
          (Dev.filesPath = Dev.pathName));
        if (
          ((UnsupportedRedirect.requiresWebGL = !0),
          UnsupportedRedirect.unsupported() || !Device.graphics.webgl.webgl2)
        ) {
          if (!window.__WEBGL_CONTEXT_LOSS)
            return void window.location.replace(window._UNSUPPORTED_PAGE_);
          onContextLoss();
        }
        !Device.mobile &&
          "linux" === Device.system.os &&
          Device.touchCapable &&
          (Device.mobile = { phone: !0 });
        (Events.emitter._addEvent(Events.WEBGL_CONTEXT_LOSS, onContextLoss),
          ("object" == typeof Config && (Config.DEV || "dev" === Config.ENV)) ||
            Hydra.LOCAL ||
            ((ImageDecoder.disableFallbackImage = !0),
            (Assets.disableFallbackImage = !0),
            Utils3D.addTextureToCache(
              "assets/images/_scenelayout/uv.jpg",
              Utils3D.getEmptyTexture(),
            )));
        if ((GLUI.init(), new URLSearchParams(window.location.search).has("p")))
          return AssetLoader.loadAssets(Assets.list().filter(["shaders"])).then(
            Playground.instance,
          );
        Container.instance();
      })();
    })();
  }