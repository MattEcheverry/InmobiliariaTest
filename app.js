"use strict";

(function () {
  const WA_URL = "https://wa.me/573022584900";

  function q(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function safe(fn) {
    try {
      return fn();
    } catch (_e) {
      /* do not break rendering */
      return undefined;
    }
  }

  function getListings() {
    const candidates = [
      window.properties,
      window.PROPERTIES,
      window.listings,
      window.LISTINGS,
      window.data,
      window.DATA,
    ];
    for (let i = 0; i < candidates.length; i += 1) {
      if (Array.isArray(candidates[i])) return candidates[i];
    }
    return [];
  }

  function modeOf(value) {
    return String(value || "").toLowerCase().includes("venta") ? "venta" : "arriendo";
  }

  function formatCOP(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "Precio a consultar";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(n);
  }

  function setupHeader() {
    const header = q(".site-header");
    if (!header) return;

    const logo = q(".brand img", header);
    if (logo instanceof HTMLImageElement) {
      logo.src = "./assets/logo-nuevo.png";
      logo.alt = "Grupo Versa";
      logo.onerror = function () {
        this.src = "./assets/logo-grupo-versa.png";
      };
    }

    const zoneBtns = qa("a,button", header).filter((el) => {
      if (el.closest(".dropdown-menu")) return false;
      return /zona clientes/i.test((el.textContent || "").trim());
    });
    if (zoneBtns.length > 1) zoneBtns.slice(1).forEach((el) => el.remove());

    const zone = zoneBtns[0];
    if (zone) {
      zone.classList.add("btn", "btn-secondary");
      zone.textContent = "Ver zona clientes";
      if (!zone.id) zone.id = "openClients";
    }

    const wa = qa("a,button", header).find((el) =>
      /whatsapp/i.test((el.textContent || "").trim())
    );
    if (wa) {
      wa.classList.add("btn", "btn-primary");
      wa.textContent = "Hablar por WhatsApp";
      if (wa.tagName === "A") {
        wa.setAttribute("href", WA_URL);
        wa.setAttribute("target", "_blank");
        wa.setAttribute("rel", "noopener");
      }
    }
  }

  function setupHero() {
    const title = q(".hero-title");
    if (title) title.textContent = "Rentas. Ventas. Seguros. Avalúos.";
  }

  function setupDropdown() {
    qa("[data-dropdown-button]").forEach((btn) => {
      const dropdown = btn.closest(".dropdown");
      if (!dropdown) return;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const wasOpen = dropdown.classList.contains("open");
        qa(".dropdown.open").forEach((d) => d.classList.remove("open"));
        btn.setAttribute("aria-expanded", wasOpen ? "false" : "true");
        if (!wasOpen) dropdown.classList.add("open");
      });
    });

    document.addEventListener("click", function (e) {
      qa(".dropdown.open").forEach((d) => {
        if (!d.contains(e.target)) {
          d.classList.remove("open");
          const b = q("[data-dropdown-button]", d);
          if (b) b.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  function setupMobileDrawer() {
    const drawer = q("#mobile-drawer");
    const toggle = q(".menu-toggle");
    if (!drawer || !toggle) return;

    const close = q(".drawer-close", drawer);
    function openDrawer() {
      drawer.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("modal-open");
    }
    function closeDrawer() {
      drawer.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("modal-open");
    }

    toggle.addEventListener("click", function () {
      if (drawer.hidden) openDrawer();
      else closeDrawer();
    });
    if (close) close.addEventListener("click", closeDrawer);
    drawer.addEventListener("click", function (e) {
      if (e.target === drawer) closeDrawer();
    });
  }

  function setupModeTabs() {
    const tabs = qa("[data-mode-tab]");
    const hiddenField = q("[data-mode-field]");
    if (!tabs.length) return { current: "arriendo" };

    const state = { current: "arriendo" };
    function paint() {
      tabs.forEach((tab) => {
        const m = modeOf(tab.getAttribute("data-mode-tab"));
        const active = m === state.current;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-pressed", active ? "true" : "false");
      });
      if (hiddenField) hiddenField.value = state.current;
    }
    tabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        state.current = modeOf(tab.getAttribute("data-mode-tab"));
        paint();
        document.dispatchEvent(new CustomEvent("gv:mode", { detail: { mode: state.current } }));
      });
    });
    paint();
    return state;
  }

  function setupCounts(listings) {
    const counts = { arriendo: 0, venta: 0 };
    listings.forEach((item) => {
      counts[modeOf(item && item.operacion)] += 1;
    });
    qa("[data-mode-count]").forEach((el) => {
      const m = modeOf(el.getAttribute("data-mode-count"));
      el.textContent = String(counts[m] || 0);
    });
  }

  function listingCard(item) {
    const title = item && item.titulo ? item.titulo : "Inmueble en Cali";
    const image = item && item.imagen ? item.imagen : "./assets/placeholder.svg";
    const barrio = item && (item.barrio || item.direccionCorta) ? (item.barrio || item.direccionCorta) : "Cali";
    const hab = item && item.habitaciones != null ? item.habitaciones : "-";
    const banos = item && item.banos != null ? item.banos : "-";
    const area = item && item.areaM2 != null ? item.areaM2 : "-";
    const source = item && item.source ? item.source : "";
    const sourceUrl = item && item.sourceUrl ? item.sourceUrl : "";
    const sourceHtml = source
      ? `<div class="listing-source">${sourceUrl ? `<a href="${sourceUrl}" target="_blank" rel="noopener">Fuente: ${source}</a>` : `Fuente: ${source}`}</div>`
      : "";

    return `
      <article class="listing-card">
        <div class="listing-media"><img src="${image}" alt="${title.replace(/"/g, "&quot;")}"></div>
        <div class="listing-body">
          <p class="listing-price">${formatCOP(item && item.precio)}</p>
          <h3 class="listing-title">${title}</h3>
          <p class="listing-location">${barrio}</p>
          <div class="listing-specs">
            <span>${hab} hab</span>
            <span>${banos} baños</span>
            <span>${area} m²</span>
          </div>
          ${sourceHtml}
        </div>
      </article>
    `;
  }

  function setupFeatured(listings, state) {
    const grid = q("[data-featured-grid], #featuredGrid, .featured-grid");
    if (!grid) return;

    function render(mode) {
      const filtered = listings.filter((it) => modeOf(it && it.operacion) === mode);
      const safeList = filtered.length ? filtered : listings;
      grid.innerHTML = safeList.slice(0, 6).map(listingCard).join("");
    }

    render(state.current);
    document.addEventListener("gv:mode", function (e) {
      const mode = e && e.detail && e.detail.mode ? e.detail.mode : "arriendo";
      render(mode);
    });
  }

  async function loadContent() {
    const nodes = qa("[data-bind]");
    if (!nodes.length) return;
    try {
      const res = await fetch("./content.json?v=102", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      nodes.forEach((node) => {
        const path = node.getAttribute("data-bind");
        if (!path) return;
        const normalized = path.replace(/\[(\d+)\]/g, ".$1").split(".");
        let value = data;
        for (let i = 0; i < normalized.length; i += 1) {
          if (value == null) break;
          value = value[normalized[i]];
        }
        if (value == null) return;
        node.textContent = String(value);
      });
    } catch (_e) {
      /* keep static fallback copy */
    }
  }

  function init() {
    safe(setupHeader);
    safe(setupHero);
    safe(setupDropdown);
    safe(setupMobileDrawer);
    const listings = getListings();
    safe(function () { setupCounts(listings); });
    const state = safe(function () { return setupModeTabs(); }) || { current: "arriendo" };
    safe(function () { setupFeatured(listings, state); });
    safe(loadContent);
    console.log("GV UI loaded", { hasDrawer: !!q("#clientsDrawer") });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
