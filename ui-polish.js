(() => {
  const ASSET_VERSION = "99";

  const normalizeAssetLinks = () => {
    const normalize = (value, file) => {
      if (!value) return null;
      const clean = value.split("?")[0].trim();
      if (!clean) return null;
      if (clean === file) return `${file}?v=${ASSET_VERSION}`;
      if (clean.endsWith(`/${file}`)) return `${file}?v=${ASSET_VERSION}`;
      if (clean.endsWith(`../${file}`)) return `${file}?v=${ASSET_VERSION}`;
      return null;
    };

    document.querySelectorAll('link[href]').forEach((el) => {
      const fixed = normalize(el.getAttribute("href"), "styles.css") || normalize(el.getAttribute("href"), "ui-polish.css");
      if (fixed) el.setAttribute("href", fixed);
    });

    document.querySelectorAll("script[src]").forEach((el) => {
      const fixed =
        normalize(el.getAttribute("src"), "data.js") ||
        normalize(el.getAttribute("src"), "app.js") ||
        normalize(el.getAttribute("src"), "ui-polish.js");
      if (fixed) el.setAttribute("src", fixed);
    });
  };

  const markReady = () => document.body.classList.add("ui-ready");

  const wireReveal = () => {
    const selector = [
      ".hero > *",
      ".card",
      ".property-card",
      ".listing-card",
      ".client-card",
      ".service-card",
      ".feature-card",
      "section > h1",
      "section > h2",
      "section > p",
    ].join(",");

    const nodes = [...document.querySelectorAll(selector)];
    nodes.forEach((el, idx) => {
      if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal", "");
      el.style.transitionDelay = `${Math.min(idx * 35, 280)}ms`;
    });

    if (!("IntersectionObserver" in window)) {
      nodes.forEach((el) => el.classList.add("revealed"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );

    nodes.forEach((el) => io.observe(el));
  };

  const markActiveNav = () => {
    const page = location.pathname.split("/").pop() || "index.html";
    const anchors = document.querySelectorAll("nav a[href], header a[href]");
    anchors.forEach((a) => {
      const href = (a.getAttribute("href") || "").split("?")[0];
      if (!href || href.startsWith("#")) return;
      if (href === page || (page === "" && href === "index.html")) {
        a.setAttribute("aria-current", "page");
      }
    });
  };

  const boot = () => {
    markReady();
    wireReveal();
    markActiveNav();
  };

  normalizeAssetLinks();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
