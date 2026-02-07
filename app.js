(function () {
  var CONTENT_URL = "./content.json?v=102";

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function parsePath(path) {
    return String(path || "")
      .replace(/\[(\d+)\]/g, ".$1")
      .split(".")
      .filter(Boolean);
  }

  function readPath(obj, path) {
    var parts = parsePath(path);
    var current = obj;
    for (var i = 0; i < parts.length; i += 1) {
      if (current == null) return undefined;
      current = current[parts[i]];
    }
    return current;
  }

  function toNumber(value) {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return 0;
    var n = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function formatCop(value) {
    var n = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(n);
  }

  function normalizeText(value) {
    return String(value || "").toLowerCase().trim();
  }

  function applyContentBindings(content) {
    qsa("[data-bind]").forEach(function (el) {
      var path = el.getAttribute("data-bind");
      var attr = el.getAttribute("data-bind-attr");
      var value = readPath(content, path);
      if (value == null) return;
      if (attr) {
        el.setAttribute(attr, String(value));
      } else if (typeof value === "string" || typeof value === "number") {
        el.textContent = String(value);
      }
    });
  }

  async function loadContent() {
    try {
      var res = await fetch(CONTENT_URL, { method: "GET" });
      if (!res.ok) return;
      var content = await res.json();
      applyContentBindings(content);
    } catch (error) {
      return;
    }
  }

  function firstFocusable(root) {
    return qs('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', root);
  }

  function initDrawers() {
    var overlay = qs("#overlay");
    var openClients = qs("#openClients");
    var closeClients = qs("#closeClients");
    var clientsDrawer = qs("#clientsDrawer");
    var openMobileNav = qs("#openMobileNav");
    var closeMobileNav = qs("#closeMobileNav");
    var mobileDrawer = qs("#mobileNavDrawer");
    var currentDrawer = null;
    var currentTrigger = null;
    var previousFocus = null;

    function toggle(drawer, trigger, open) {
      if (!drawer || !overlay) return;
      if (open) {
        if (currentDrawer && currentDrawer !== drawer) toggle(currentDrawer, currentTrigger, false);
        previousFocus = document.activeElement;
        currentDrawer = drawer;
        currentTrigger = trigger || null;
        drawer.hidden = false;
        overlay.hidden = false;
        document.body.classList.add("modal-open");
        if (trigger) trigger.setAttribute("aria-expanded", "true");
        var focusTarget = firstFocusable(drawer);
        if (focusTarget) focusTarget.focus();
      } else {
        drawer.hidden = true;
        if (trigger) trigger.setAttribute("aria-expanded", "false");
        if (currentDrawer === drawer) {
          currentDrawer = null;
          currentTrigger = null;
          overlay.hidden = true;
          document.body.classList.remove("modal-open");
          if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
          previousFocus = null;
        }
      }
    }

    if (openClients && clientsDrawer) {
      openClients.addEventListener("click", function () {
        toggle(clientsDrawer, openClients, clientsDrawer.hidden);
      });
    }

    if (closeClients && clientsDrawer && openClients) {
      closeClients.addEventListener("click", function () {
        toggle(clientsDrawer, openClients, false);
      });
    }

    if (openMobileNav && mobileDrawer) {
      openMobileNav.addEventListener("click", function () {
        toggle(mobileDrawer, openMobileNav, mobileDrawer.hidden);
      });
    }

    if (closeMobileNav && mobileDrawer && openMobileNav) {
      closeMobileNav.addEventListener("click", function () {
        toggle(mobileDrawer, openMobileNav, false);
      });
    }

    if (overlay) {
      overlay.addEventListener("click", function () {
        if (currentDrawer && currentTrigger) toggle(currentDrawer, currentTrigger, false);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && currentDrawer && currentTrigger) {
        toggle(currentDrawer, currentTrigger, false);
      }
    });
  }

  function initSegmentedControl() {
    qsa(".segmented").forEach(function (group) {
      var hidden = qs('input[type="hidden"]', group);
      var buttons = qsa(".seg-btn", group);
      buttons.forEach(function (button) {
        button.addEventListener("click", function () {
          var value = button.getAttribute("data-seg-value") || "";
          if (hidden) hidden.value = value;
          buttons.forEach(function (b) {
            var active = b === button;
            b.classList.toggle("is-active", active);
            b.setAttribute("aria-pressed", active ? "true" : "false");
          });
        });
      });
    });
  }

  function getListingsRaw() {
    if (Array.isArray(window.listings)) return window.listings;
    if (Array.isArray(window.inmuebles)) return window.inmuebles;
    if (Array.isArray(window.properties)) return window.properties;
    return [];
  }

  function normalizeListing(item, idx) {
    return {
      id: item.id || "listing-" + idx,
      titulo: item.titulo || item.title || "Inmueble",
      precio: Number(item.precio) || 0,
      barrio: item.barrio || item.sector || item.ciudad || "Sector no especificado",
      direccionCorta: item.direccionCorta || "",
      habitaciones: item.habitaciones == null ? null : Number(item.habitaciones),
      banos: item.banos == null ? null : Number(item.banos),
      areaM2: item.areaM2 == null ? null : Number(item.areaM2),
      parqueadero: item.parqueadero == null ? null : Number(item.parqueadero),
      estrato: item.estrato == null ? null : Number(item.estrato),
      tipo: normalizeText(item.tipo),
      operacion: normalizeText(item.operacion),
      destacado: Boolean(item.destacado),
      nuevo: Boolean(item.nuevo),
      imagen: item.imagen || "",
      source: item.source || null,
      sourceUrl: item.sourceUrl || null
    };
  }

  function listingsData() {
    return getListingsRaw().map(normalizeListing);
  }

  function spec(value, label) {
    if (value == null) return "-";
    return label ? String(value) + " " + label : String(value);
  }

  function sourceLine(item) {
    if (!item.source) return "";
    if (item.sourceUrl) {
      return '<div class="listing-source">Fuente: <a href="' + item.sourceUrl + '" target="_blank" rel="noopener">' + item.source + "</a></div>";
    }
    return '<div class="listing-source">Fuente: ' + item.source + "</div>";
  }

  function listingCard(item) {
    var imageMarkup = item.imagen
      ? '<img src="' + item.imagen + '" alt="' + item.titulo + '">'
      : '<svg viewBox="0 0 640 400" aria-hidden="true"><rect width="640" height="400" fill="#e8edf4"/><path d="M90 300h460L430 170l-65 64-62-71-98 100-45-46z" fill="#c8d5e4"/><circle cx="460" cy="130" r="28" fill="#d9e5f1"/></svg>';

    var badges = "";
    if (item.nuevo || item.destacado) {
      badges = '<div class="badge-row">' +
        (item.nuevo ? '<span class="badge badge-new">Nuevo</span>' : "") +
        (item.destacado ? '<span class="badge badge-featured">Destacado</span>' : "") +
        "</div>";
    }

    return (
      '<article class="listing-card">' +
      '<div class="listing-media-wrap">' + badges + '<div class="listing-media">' + imageMarkup + "</div></div>" +
      '<div class="listing-body">' +
      '<div class="listing-price">' + formatCop(item.precio) + "</div>" +
      '<h3 class="listing-title">' + item.titulo + "</h3>" +
      '<p class="listing-location">' + item.barrio + (item.direccionCorta ? " · " + item.direccionCorta : "") + "</p>" +
      '<div class="listing-specs">' +
      '<span class="spec">🛏 ' + spec(item.habitaciones, "") + "</span>" +
      '<span class="spec">🛁 ' + spec(item.banos, "") + "</span>" +
      '<span class="spec">▦ ' + spec(item.areaM2, "m²") + "</span>" +
      "</div>" +
      sourceLine(item) +
      "</div></article>"
    );
  }

  function renderFeatured() {
    var grid = qs("#featuredGrid");
    if (!grid) return;
    var items = listingsData().slice().sort(function (a, b) {
      return Number(b.destacado) - Number(a.destacado);
    });
    if (!items.length) {
      grid.innerHTML = '<article class="listing-card"><div class="listing-body"><h3 class="listing-title">No hay inmuebles cargados</h3><p class="listing-location">Actualiza <code>data.js</code> para poblar esta sección.</p></div></article>';
      return;
    }
    grid.innerHTML = items.slice(0, 6).map(listingCard).join("");
  }

  function setFormFromQuery(form) {
    var params = new URLSearchParams(window.location.search);
    ["operacion", "q", "tipo", "min", "max", "hab"].forEach(function (name) {
      if (params.has(name) && form[name]) form[name].value = params.get(name);
    });
  }

  function readFilters(form) {
    return {
      operacion: normalizeText(form.operacion && form.operacion.value),
      q: normalizeText(form.q && form.q.value),
      tipo: normalizeText(form.tipo && form.tipo.value),
      min: toNumber(form.min && form.min.value),
      max: toNumber(form.max && form.max.value),
      hab: toNumber(form.hab && form.hab.value)
    };
  }

  function byFilters(item, filters) {
    if (filters.operacion && item.operacion !== filters.operacion) return false;
    if (filters.tipo && item.tipo !== filters.tipo) return false;
    if (filters.q) {
      var text = normalizeText(item.titulo + " " + item.barrio + " " + item.direccionCorta);
      if (!text.includes(filters.q)) return false;
    }
    if (filters.min && item.precio < filters.min) return false;
    if (filters.max && item.precio > filters.max) return false;
    if (filters.hab && (item.habitaciones || 0) < filters.hab) return false;
    return true;
  }

  function writeQuery(filters) {
    var params = new URLSearchParams();
    Object.keys(filters).forEach(function (key) {
      var value = filters[key];
      if (value !== "" && value !== 0 && value != null) params.set(key, String(value));
    });
    var url = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    history.replaceState({}, "", url);
  }

  function initSearchPage() {
    var form = qs("#searchFilters");
    var grid = qs("#resultsGrid");
    var count = qs("#resultsCount");
    if (!form || !grid || !count) return;

    setFormFromQuery(form);
    var all = listingsData();

    function render() {
      var filters = readFilters(form);
      var filtered = all.filter(function (item) {
        return byFilters(item, filters);
      });
      count.textContent = filtered.length + " inmuebles";
      if (!filtered.length) {
        grid.innerHTML = '<article class="listing-card"><div class="listing-body"><h3 class="listing-title">No hay resultados</h3><p class="listing-location">Ajusta los filtros para encontrar más opciones.</p></div></article>';
      } else {
        grid.innerHTML = filtered.map(listingCard).join("");
      }
      writeQuery(filters);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      render();
    });

    render();
    initMapToggle();
  }

  function initMapToggle() {
    var toggle = qs(".mobile-map-toggle");
    if (!toggle) return;
    qsa("button", toggle).forEach(function (button) {
      button.addEventListener("click", function () {
        var view = button.getAttribute("data-view");
        qsa("button", toggle).forEach(function (b) {
          b.classList.toggle("is-active", b === button);
        });
        document.body.classList.toggle("show-map", view === "map");
      });
    });
  }

  function init() {
    loadContent();
    initDrawers();
    initSegmentedControl();
    renderFeatured();
    initSearchPage();
    console.log("GV UI loaded", { hasDrawer: !!document.getElementById("clientsDrawer") });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
