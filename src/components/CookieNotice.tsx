import { Fragment, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { NoisyBorder } from "./NoisyBorder";
import { privacyUrl } from "./SourceArt";
import { readingSession } from "../engine/session";

const countries = new Set(
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE GB NO IS LI CH".split(
    " ",
  ),
);
const geoUrl = "https://us-central1-at-services.cloudfunctions.net/geo";

async function needsNotice(signal: AbortSignal) {
  const forced = new URLSearchParams(location.search).has("cookieNotice");
  if (
    !forced &&
    (localStorage.getItem("cookies_allow") ||
      localStorage.getItem("cookies_declined"))
  )
    return false;
  try {
    const response = await fetch(geoUrl, { signal });
    if (!response.ok) return false;
    const geo = await response.json();
    return forced || countries.has(geo.location?.countryCode);
  } catch {
    return false;
  }
}

const words = (text: string) =>
  text.split(" ").map((word, i, array) => (
    <Fragment key={i}>
      <span className="notice-clip">
        <span className="notice-word">{word}</span>
      </span>
      {i < array.length - 1 ? " " : ""}
    </Fragment>
  ));

export function CookieNotice({ onSound }: { onSound: () => void }) {
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLElement>(null);
  const accepted = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    void needsNotice(controller.signal).then((value) => {
      if (!controller.signal.aborted) setVisible(value);
    });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!visible) return;
    const element = root.current!;
    const delay = Math.max(0, 4.5 - readingSession.time);
    const animation = gsap.timeline({ delay });
    animation.fromTo(
      element,
      { yPercent: 130 },
      { yPercent: 0, duration: 0.8, ease: "power2.out" },
      0,
    );
    animation.fromTo(
      element.querySelectorAll(".notice-word"),
      { yPercent: 105 },
      { yPercent: 0, duration: 0.8, stagger: 0.01, ease: "power2.out" },
      0.5,
    );
    element
      .querySelectorAll(".XButton")
      .forEach((button, i) =>
        animation.fromTo(
          button.querySelectorAll(".notice-char"),
          { yPercent: 105 },
          { yPercent: 0, duration: 0.8, ease: "power2.out" },
          0.75 + i * 0.2,
        ),
      );
    return () => {
      animation.kill();
      gsap.killTweensOf(element);
    };
  }, [visible]);
  const dismiss = (allow: boolean) => {
    if (accepted.current) return;
    accepted.current = true;
    localStorage.setItem(allow ? "cookies_allow" : "cookies_declined", "true");
    localStorage.removeItem(allow ? "cookies_declined" : "cookies_allow");
    onSound();
    gsap.to(root.current, {
      yPercent: 120,
      duration: 0.3,
      ease: "power2.out",
      overwrite: true,
      onComplete: () => setVisible(false),
    });
  };
  if (!visible) return null;
  return (
    <aside ref={root} className="CookieBanner" aria-label="Cookie preferences">
      <div className="cookie__background">
        <NoisyBorder notice />
      </div>
      <div className="cookie-banner-content">
        <div className="XText body-regular">
          {words(
            "This website uses cookies to improve your experience and for analytics and marketing purposes. View our",
          )}{" "}
          <a
            className="privacy-link"
            href={privacyUrl}
            target="_blank"
            rel="noreferrer"
          >
            {words("Privacy Policy")}
          </a>{" "}
          {words("for more information.")}
        </div>
        <div className="cookie-banner-buttons">
          {["Accept", "Decline"].map((label, i) => (
            <div className="XButton" key={label}>
              <button
                aria-label={label}
                className={"x-button" + (i ? " secondary" : "")}
                onClick={() => dismiss(!i)}
              >
                <span
                  className="XText body-bold notice-clip"
                  aria-hidden="true"
                >
                  {[...label].map((letter, j) => (
                    <span key={j} className="notice-char">
                      {letter}
                    </span>
                  ))}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
