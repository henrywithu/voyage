function FooterUI(_params, ...restArgs) {
    const _this = this;
    (Inherit(_this, BaseUI),
      Inherit(_this, XComponent),
      (_this.fragName = "FooterUI"),
      (_this.contexts = "BaseUI"),
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
              className: "footer-group",
              _type: "div",
              refName: "unnamed",
              children: [
                {
                  className: "footer-logo",
                  _type: "div",
                  refName: "logo",
                  children: [
                    {
                      src: "assets/images/footer_logo.svg",
                      alt: "Santioni Spirits Logo",
                      _type: "img",
                      refName: "unnamed",
                      children: [],
                    },
                  ],
                },
                {
                  className: "footer-social",
                  _type: "div",
                  refName: "unnamed",
                  children: [
                    {
                      className: "body-bold",
                      href: "$copy.instagramLink",
                      target: "_blank",
                      _type: "a",
                      _innerText: "instagram",
                      refName: "instagramLink",
                      children: [],
                    },
                    {
                      className: "body-regular footer-email",
                      href: "mailto:indulge@santionispirits.com",
                      _type: "a",
                      _innerText: "indulge@santionispirits.com",
                      refName: "emailLink",
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              className: "footer-links body-regular",
              _type: "div",
              refName: "unnamed",
              children: [
                {
                  _type: "span",
                  refName: "unnamed",
                  children: [
                    {
                      _type: "inlinetext",
                      _innerText: "\n                Made by\n                ",
                      refName: "unnamed",
                      children: [],
                    },
                    {
                      className: "underline",
                      href: "https://activetheory.net/",
                      target: "_blank",
                      rel: "noreferrer",
                      _type: "a",
                      _innerText: "Active Theory",
                      refName: "activeTheoryLink",
                      children: [],
                    },
                    {
                      _type: "inlinetext",
                      _innerText: "\n                and\n                ",
                      refName: "unnamed",
                      children: [],
                    },
                    {
                      className: "underline",
                      href: "https://plan8.co/",
                      target: "_blank",
                      rel: "noreferrer",
                      _type: "a",
                      _innerText: "Plan8",
                      refName: "plan8Link",
                      children: [],
                    },
                  ],
                },
                {
                  href: "$copy.privacyPolicy",
                  target: "_blank",
                  _type: "a",
                  _innerText: "Legal",
                  refName: "privacyPolicyLink",
                  children: [],
                },
              ],
            },
          ],
        }),
        _this.layout?.getAllLayers &&
          (_this.layers = await _this.layout.getAllLayers()));
      let onInit = _this.onInit;
      ((_this.useScrollTrigger = !0),
        (_this.isContinuous = !0),
        (_this.copy = Config.CMS_COPY.homePage),
        (_this.onMounted = function () {
          (_this.instagramLink.bind("click", function () {
            GoogleAnalytics.track("instagram_link_click");
          }),
            _this.emailLink.bind("click", function () {
              GoogleAnalytics.track("email_link_click");
            }),
            _this.activeTheoryLink.bind("click", function () {
              GoogleAnalytics.track("active_theory_link_click");
            }),
            _this.plan8Link.bind("click", function () {
              GoogleAnalytics.track("plan_eight_link_click");
            }),
            _this.privacyPolicyLink.bind("click", function () {
              GoogleAnalytics.track("privacy_policy_link_click");
            }),
            _this.logo.interact(
              (_) => {},
              () => Story.scrollToTop(),
            ));
        }),
        (_this.onInView = () => {
          _this.fire("Footer/inView");
        }),
        (_this.onOutView = () => {
          _this.fire("Footer/outView");
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
          "FooterUI" !== _this.fragName ||
          !_this.onInit ||
          _this.onInit.calledInit ||
          (onInit = _this.onInit),
        onInit && (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
    })();
  }