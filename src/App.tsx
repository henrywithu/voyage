import { useEffect, useRef, useState, type CSSProperties } from "react";
import { readingSession } from "./engine/session";
import { Experience } from "./engine/Experience";
import {
  sections,
  range,
  worldHeight,
  type SectionName,
} from "./data/sections";
import { CookieNotice } from "./components/CookieNotice";
import { RotatePrompt } from "./components/RotatePrompt";
import { HeaderMenu } from "./components/HeaderMenu";
import { Loader } from "./components/Loader";
import { AgeGate } from "./components/AgeGate";
import { Editorial, SourceArt, findArt } from "./components/SourceArt";
import { products } from "./scenes/products";
import { Soundscape } from "./audio/Soundscape";
import { roundRobins } from "./audio/catalog";
import { assetUrl } from "./engine/assetUrl";

export default function App() {
  const stage = useRef<HTMLDivElement>(null),
    pages = useRef<HTMLDivElement>(null),
    engine = useRef<Experience | undefined>(undefined),
    sound = useRef(new Soundscape());
  const [progress, setProgress] = useState(0),
    [ready, setReady] = useState(false),
    [entered, setEntered] = useState(readingSession.entered),
    [gateExited, setGateExited] = useState(readingSession.entered),
    [loaderExited, setLoaderExited] = useState(readingSession.entered),
    [gateStarted, setGateStarted] = useState(readingSession.entered),
    [error, setError] = useState(""),
    [muted, setMuted] = useState(readingSession.muted),
    [mode, setMode] = useState("experience"),
    [productIndex, setProductIndex] = useState(readingSession.selected);
  const [viewport, setViewport] = useState({ w: innerWidth, h: innerHeight });
  const enteredRef = useRef(readingSession.entered);
  const scrollRef = useRef(readingSession.scroll);
  useEffect(() => {
    let cancelled = false;
    const audio = (sound.current = new Soundscape());
    audio.muted = readingSession.muted;
    const exp = new Experience(stage.current!, pages.current!);
    exp.onAudio = (id, volume, robin) => {
      if (robin && id in roundRobins)
        sound.current.roundRobin(id as keyof typeof roundRobins, volume);
      else void sound.current.play(id, volume);
    };
    engine.current = exp;
    if (import.meta.env.DEV)
      (window as unknown as { __exp?: Experience }).__exp = exp;
    exp.onProductChange = setProductIndex;
    exp.selected = readingSession.selected;
    exp.onSelect = (index) => {
      readingSession.selected = index;
    };
    exp.onFrame = (frame) => {
      if (enteredRef.current) {
        readingSession.scroll = frame.scroll;
        readingSession.time = frame.time;
      }
      const index = exp.sections.findLastIndex(
        (s) => s.pixelTop <= frame.scroll + frame.height * 0.4,
      );
      sound.current.update(frame, exp.sections);
      exp.setAudioLevels(sound.current.bands);
      sound.current.narrate(frame, exp.boxes);
      const taste = exp.sections.find((s) => s.name === "TasteScene");
      setMode(
        taste &&
          frame.scroll > taste.pixelTop - (0.4 * frame.height) / worldHeight
          ? "collection"
          : "experience",
      );
    };
    exp
      .load(setProgress)
      .then(() => {
        if (cancelled) return;
        sound.current.registerBoxes(exp.boxes);
        if (enteredRef.current) {
          exp.enter(readingSession.time);
          exp.restoreScroll(scrollRef.current);
        }
        setReady(true);
      })
      .catch((e) => {
        console.error(e);
        setError(String(e));
      });
    const resumeAudio = () => {
      if (enteredRef.current) void sound.current.start();
    };
    window.addEventListener("pointerdown", resumeAudio, { passive: true });
    const onResize = () => setViewport({ w: innerWidth, h: innerHeight });
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      if (exp.ready) scrollRef.current = exp.scroll;
      exp.dispose();
      audio.dispose();
      window.removeEventListener("pointerdown", resumeAudio);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  useEffect(() => {
    engine.current?.resize();
  }, [viewport]);
  const enter = () => {
    readingSession.entered = true;
    enteredRef.current = true;
    setEntered(true);
    engine.current?.enter();
    void sound.current.start();
  };
  const go = (name: SectionName) => {
    const duration = engine.current?.go(name) ?? 0;
    sound.current.beginNavigation();
    if (name === "WanderScene") sound.current.resetNarration(duration);
    void sound.current.play("one-shots/uiClick");
  };
  const choose = (delta: number) => {
    engine.current?.productStep(delta);
  };
  return (
    <div id="Stage" ref={stage}>
      <main
        className="pages"
        ref={pages}
        aria-label="The Trapnest Experience"
        inert={!entered}
      >
        {sections.map((config) => {
          const auto = "auto" in config;
          const h =
            "mobileHeight" in config
              ? range(viewport.w, 1600, 393, config.height, config.mobileHeight)
              : config.height;
          return (
            <section
              key={config.name}
              data-scene={config.name}
              data-retailers-length={
                config.name === "RetailScene" ? "0" : undefined
              }
              className={config.name.replace("Scene", "UI")}
              style={
                {
                  "--height": auto ? undefined : `${h * viewport.h}px`,
                  height: auto ? undefined : h * viewport.h,
                  marginTop:
                    "marginTop" in config
                      ? config.marginTop * viewport.h
                      : undefined,
                } as CSSProperties
              }
            >
              {config.name === "DrinkPourScene" && (
                <div className="pour-section" />
              )}
              {config.name === "TasteScene" && <Editorial name="TasteUI" />}
              {config.name === "CollectionScene" && (
                <Editorial name="CollectionUI" />
              )}
              {config.name === "ProductsScene" && (
                <>
                  <div className="container">
                    <button
                      className="left-text body-bold"
                      onClick={() => choose(-1)}
                    >
                      {products[(productIndex + 2) % 3].short}
                    </button>
                    <div className="gl-bounds" />
                    <button
                      className="right-text body-bold"
                      onClick={() => choose(1)}
                    >
                      {products[(productIndex + 1) % 3].short}
                    </button>
                  </div>
                  <div className="mobile-arrows">
                    <button
                      className="mobile-arrow-left"
                      aria-label="previous slide"
                      onClick={() => choose(-1)}
                    >
                      <SourceArt
                        node={findArt("ProductsUI", "prevSlide")?.children?.[0]}
                      />
                    </button>
                    <button
                      className="mobile-arrow-right"
                      aria-label="next slide"
                      onClick={() => choose(1)}
                    >
                      <SourceArt
                        node={findArt("ProductsUI", "nextSlide")?.children?.[0]}
                      />
                    </button>
                  </div>
                </>
              )}
              {config.name === "RetailScene" && <Editorial name="RetailUI" />}
              {config.name === "FooterScene" && (
                <>
                  <div className="footer-group">
                    <div className="footer-logo">
                      <img
                        src={assetUrl("assets/images/trapnest-voyage-logo-footer.svg")}
                        alt="Trapnest Voyage"
                      />
                    </div>
                  </div>
                  <div className="footer-links body-regular">
                    <span>
                      Made by{" "}
                      <a
                        className="underline"
                        href="https://henrywithu.com/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Trapnest
                      </a>
                    </span>
                  </div>
                </>
              )}
            </section>
          );
        })}
      </main>
      {entered && (
        <>
          <button
            className="brand"
            aria-label="Return to the beginning"
            onClick={() => go("WanderScene")}
          >
            <img
              src={
                viewport.w < 768
                  ? assetUrl("assets/images/trapnest-voyage-logo-mobile.png")
                  : assetUrl("assets/images/trapnest-voyage-logo.png")
              }
              alt="Trapnest Voyage"
            />
          </button>
          <HeaderMenu
            mode={mode}
            onExperience={() => go("WanderScene")}
            onCollection={() => go("ProductsScene")}
            onHover={(hover) => engine.current?.menuHover(hover)}
          />
          <button
            className={"sound-toggle " + (muted ? "muted" : "")}
            aria-label="Toggle audio"
            aria-pressed={muted}
            onClick={() => {
              const value = sound.current.toggle();
              readingSession.muted = value;
              setMuted(value);
            }}
          />
          <CookieNotice
            onSound={() => {
              void sound.current.play("ui_click");
            }}
          />
        </>
      )}
      <RotatePrompt />
      {!loaderExited && (
        <Loader
          progress={progress}
          error={error}
          ready={ready}
          onReveal={() => setGateStarted(true)}
          onExit={() => setLoaderExited(true)}
        />
      )}
      {ready && gateStarted && !gateExited && (
        <AgeGate
          onEnter={enter}
          onExit={() => setGateExited(true)}
          onState={(state) => engine.current?.setAgeGate(state)}
          onSound={() => {
            void sound.current
              .start()
              .then(() => sound.current.play("ui_click"));
          }}
        />
      )}
    </div>
  );
}
