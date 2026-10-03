function UILHistoryTab(_params, ...restArgs) {
      const _this = this;
      (Inherit(_this, Element),
        Inherit(_this, XComponent),
        (_this.fragName = "UILHistoryTab"),
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
                className: "history__panel days__body",
                _type: "div",
                refName: "dayPanel",
                children: [
                  {
                    data: "$dayData",
                    view: "UILHistoryDay",
                    _type: "ViewState",
                    refName: "unnamed",
                    children: [],
                  },
                ],
              },
              {
                className: "history__panel records",
                _type: "div",
                refName: "recordsPanel",
                children: [
                  {
                    className: "records__header",
                    _type: "header",
                    refName: "unnamed",
                    children: [
                      {
                        className: "records__back",
                        _type: "div",
                        refName: "recordsBack",
                        children: [],
                      },
                      {
                        className: "records__date",
                        _type: "h3",
                        _innerText: "Date",
                        refName: "recordsDateLabel",
                        children: [],
                      },
                    ],
                  },
                  {
                    className: "records__body",
                    _type: "div",
                    refName: "unnamed",
                    children: [
                      {
                        data: "$activePageData",
                        view: "UILHistoryRecord",
                        _type: "ViewState",
                        refName: "unnamed",
                        children: [],
                      },
                    ],
                  },
                  {
                    _type: "footer",
                    refName: "footer",
                    children: [
                      {
                        data: "$paginatedData",
                        _type: "UILHistoryPaginationControls",
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
        const dayDataId = _this.params?.actorId
            ? `${_this.params.actorId}-days`
            : "days",
          recordsDataId = _this.params?.actorId
            ? `${_this.params.actorId}-records`
            : "records";
        function paginateRecords(
          data,
          recordsPerPage = 20,
          maxButtonCount = 7,
        ) {
          const result = [],
            pageCount = Math.ceil(data.length / recordsPerPage);
          pageCount <= 1
            ? _this.footer.classList().add("hidden")
            : _this.footer.classList().remove("hidden");
          for (let i = 0; i < pageCount; i++) {
            const start = i * recordsPerPage,
              end = start + recordsPerPage,
              pageItems = data.slice(start, end);
            result.push({
              currentPageIndex: _this.state.currentPageIndex,
              pageCount: pageCount,
              maxButtonCount: maxButtonCount,
              active: i === _this.state.currentPageIndex,
              index: i,
              label: `${i + 1}`,
              items: pageItems,
              callback: (activeIndex) => updatePaginationIndex(activeIndex),
            });
          }
          return result;
        }
        function updatePaginationIndex(activeIndex) {
          activeIndex < 0 ||
            activeIndex >= _this.paginatedData.length ||
            (_this.state.set("currentPageIndex", activeIndex),
            _this.paginatedData.forEach((page, index) => {
              page.active = index === activeIndex;
            }),
            updateActivePageData());
        }
        function updateActivePageData() {
          (_this.paginatedData.refresh(
            paginateRecords(_this.recordsData.toJSON()),
          ),
            _this.activePageData.refresh(
              _this.paginatedData[_this.state.currentPageIndex].items,
            ));
        }
        function getTime(unixTimestamp) {
          const date = new Date(1e3 * unixTimestamp),
            hours = date.getHours(),
            minutes = date.getMinutes();
          return `${hours % 12 || 12}:${minutes < 10 ? "0" : ""}${minutes} ${hours >= 12 ? "PM" : "AM"}`;
        }
        ((_this.history = (function getData() {
          const cleanHistory = UILStorage.getHistory(_this.params?.actorId).map(
            (item) => ({
              actorName: "",
              timeFormatted: getTime(item.change.time),
              ...item.change,
            }),
          );
          return (function groupByDay(list) {
            let result = {};
            return (
              list.forEach((item) => {
                let date = (function formatDate(time) {
                  const date = new Date(time),
                    monthNames = [
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ],
                    monthIndex = date.getMonth(),
                    day = date.getDate();
                  return `${monthNames[monthIndex]} ${day}`;
                })(1e3 * item.time);
                (result[date] || (result[date] = []), result[date].push(item));
              }),
              result
            );
          })(cleanHistory);
        })()),
          (_this.dayData = Data.request(dayDataId, () =>
            Object.entries(_this.history)
              .map(([k, v]) => ({ date: k, amount: `(${v.length})` }))
              .reverse(),
          )),
          (_this.recordsData = await Data.request(
            recordsDataId,
            () => _this.history[Object.keys(_this.history)[0]],
          )),
          _this.createState(),
          _this.state.set("currentPageIndex", 0),
          (_this.paginatedData = new StateArray(
            paginateRecords(_this.recordsData.toJSON()),
          )),
          (_this.activePageData = new StateArray(
            _this.paginatedData[_this.state.currentPageIndex]?.items,
          )),
          (_this.onMounted = () => {
            !(function initListeners() {
              _this.recordsBack.click(_this.showDaysPanel);
            })();
          }),
          (_this.onInit = async function () {
            (!(async function setActorsName() {
              const actors = await UILStorage.getUsers();
              for (let key in _this.history)
                _this.history[key] = _this.history[key].map((record) => {
                  const actor = actors.find((a) => a.actorId === record.actor);
                  return ((record.actorName = actor?.name || ""), record);
                });
            })(),
              (function initHTML() {
                _this.recordsBack.html(UILHistoryTab.arrowLeftIcon);
              })());
          }),
          (_this.onSelectDay = (day) => {
            (!(function updateRecordsData(day) {
              ((_this.state.currentPageIndex = 0),
                _this.recordsDateLabel.text(day),
                _this.recordsData.refresh([..._this.history[day]].reverse()),
                updateActivePageData());
            })(day),
              (function showRecordsPanel() {
                (_this.dayPanel.tween({ x: "-100%" }, 500, "easeOutCubic"),
                  _this.recordsPanel.tween(
                    { x: "-100%" },
                    500,
                    "easeOutCubic",
                  ));
              })());
          }),
          (_this.updatePaginationIndex = updatePaginationIndex),
          (_this.showDaysPanel = function () {
            (_this.dayPanel.tween({ x: 0 }, 500, "easeOutCubic"),
              _this.recordsPanel.tween({ x: 0 }, 500, "easeOutCubic"));
          }),
          _this.element.goob(
            "\n    & {\n        display: flex;\n        width: 100%;\n        height: 100%;\n        pointer-events: auto;\n        overflow: hidden;\n        padding-bottom: 40px;\n    }\n\n    .history {\n        &__panel {\n            width: 100%;\n            height: 100%;\n            flex-shrink: 0;\n            padding-bottom: 40px;\n        }\n    }\n\n    .days {\n        &__body {\n            height: 100%;\n            overflow: auto;\n        }\n    }\n\n    .records {\n        display: flex;\n        flex-direction: column;\n\n        &__header {\n            display: flex;\n            align-items: center;\n\n            border-bottom: 1px solid var(--color-neutral-40);\n        }\n\n        &__body {\n            flex-grow: 1;\n            overflow: auto;\n        }\n\n        &__back {\n            padding: 0.8125rem 1rem;\n\n            &:hover {\n                > svg { stroke: var(--font-color-base); }\n            }\n\n            > svg {\n                display: block;\n\n                stroke: var(--color-neutral-70);\n\n                transition: stroke 0.17s ease-in-out;\n            }\n        }\n\n        &__date {\n            flex-grow: 1;\n            margin: 0;\n            padding: 0.8125rem 1rem 0.8125rem 0;\n        }\n\n    }\n    \n    .footer {\n        position: absolute;\n        bottom: -1px;\n        width: 100%;\n\n        &.hidden {\n            display: none;\n        }\n    }\n",
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
            "UILHistoryTab" !== _this.fragName ||
            !_this.onInit ||
            _this.onInit.calledInit ||
            (onInit = _this.onInit),
          onInit &&
            (onInit.calledInit || ((onInit.calledInit = !0), onInit())));
      })();
    }