(function () {
  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function toNumber(value) {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return 0;
    var n = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeText(value) {
    return String(value || "").toLowerCase().trim();
  }

  function formatCop(value) {
    var amount = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(amount);
  }

  function getRawListings() {
    var lexicalCandidates = [];
    if (typeof properties !== "undefined") lexicalCandidates.push(properties);
    if (typeof inmuebles !== "undefined") lexicalCandidates.push(inmuebles);
    if (typeof listings !== "undefined") lexicalCandidates.push(listings);
    if (typeof data !== "undefined") lexicalCandidates.push(data);
    if (typeof DATA !== "undefined") lexicalCandidates.push(DATA);

    var candidates = [
      lexicalCandidates[0],
      lexicalCandidates[1],
      lexicalCandidates[2],
      lexicalCandidates[3],
      lexicalCandidates[4],
      window.properties,
      window.inmuebles,
      window.PROPERTIES,
      window.listings,
      window.data,
      window.DATA
    ];

    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = candidates[i];
      if (Array.isArray(candidate)) return candidate;
      if (candidate && typeof candidate === "object") {
        var keys = ["properties", "inmuebles", "items", "data", "results"];
        for (var k = 0; k < keys.length; k += 1) {
          if (Array.isArray(candidate[keys[k]])) return candidate[keys[k]];
        }
      }
    }
    return [];
  }

  function normalizeListing(item, index) {
    var images = Array.isArray(item.images) ? item.images : [];
    var image = item.imagen || item.image || images[0] || "";
    var price = toNumber(item.precio || item.price || item.valor || item.canon);
    var bedrooms = toNumber(item.habitaciones || item.habs || item.alcobas || item.rooms);
    var bathrooms = toNumber(item.banos || item["baños"] || item.bathrooms);
    var area = toNumber(item.area || item.m2 || item.metros);
    var op = normalizeText(item.tipo || item.operacion || item.operation || "");
    var category = normalizeText(item.clase || item.categoria || item.category || "");
    var title = item.titulo || item.title || item.nombre || "Inmueble " + (index + 1);
    var location = item.barrio || item.sector || item.ciudad || item.ubicacion || item.direccionCorta || "Ubicación por confirmar";
    return {
      id: item.id || "item-" + index,
      title: title,
      location: location,
      price: price,
      tipo: op,
      clase: category,
      bedrooms: bedrooms,
      bathrooms: bathrooms,
      area: area,
      image: image,
      nuevo: Boolean(item.nuevo),
      destacado: Boolean(item.destacado)
    };
  }

  function getListings() {
    return getRawListings().map(normalizeListing).filter(function (it) {
      return it && it.title;
    });
  }

  function cardTemplate(item) {
    var badgeHtml = "";
    if (item.nuevo || item.destacado) {
      badgeHtml = '<div class="badge-row">' +
        (item.nuevo ? '<span class="badge badge-new">Nuevo</span>' : "") +
        (item.destacado ? '<span class="badge badge-featured">Destacado</span>' : "") +
        "</div>";
    }

    var media = item.image
      ? '<img src="' + item.image + '" alt="' + item.title + '">'
      : '<div class="listing-media"></div>';

    return (
      '<article class="listing-card">' +
      '<div class="listing-media-wrap" style="position:relative">' +
      badgeHtml +
      '<div class="listing-media">' + media + "</div>" +
      "</div>" +
      '<div class="listing-body">' +
      '<div class="listing-price">' + formatCop(item.price) + "</div>" +
      '<h3 class="listing-title">' + item.title + "</h3>" +
      '<p class="listing-location">' + item.location + "</p>" +
      '<div class="listing-specs">' +
      '<span class="spec">🛏 ' + (item.bedrooms || "-") + "</span>" +
      '<span class="spec">🛁 ' + (item.bathrooms || "-") + "</span>" +
      '<span class="spec">▦ ' + (item.area || "-") + " m²</span>" +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function initSegmentedControl() {
    qsa(".segmented").forEach(function (group) {
      var hidden = qs('input[type="hidden"]', group);
      var buttons = qsa(".seg-btn", group);
      buttons.forEach(function (button) {
        button.addEventListener("click", function () {
          var value = button.getAttribute("data-seg-value") || "arriendo";
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

  function initHome() {
    var grid = qs("#featuredGrid");
    if (!grid) return;
    var items = getListings().sort(function (a, b) {
      return Number(b.destacado) - Number(a.destacado);
    });

    if (!items.length) {
      grid.innerHTML = '<article class="listing-card"><div class="listing-body"><h3 class="listing-title">Sin inmuebles disponibles</h3><p class="listing-location">Actualiza data.js para cargar propiedades.</p></div></article>';
      return;
    }
    grid.innerHTML = items.slice(0, 6).map(cardTemplate).join("");
  }

  function getFiltersFromForm(form) {
    return {
      tipo: normalizeText(form.tipo && form.tipo.value),
      q: normalizeText(form.q && form.q.value),
      clase: normalizeText(form.clase && form.clase.value),
      min: toNumber(form.min && form.min.value),
      max: toNumber(form.max && form.max.value),
      hab: toNumber(form.hab && form.hab.value)
    };
  }

  function passFilters(item, filters) {
    if (filters.tipo && !normalizeText(item.tipo).includes(filters.tipo)) return false;
    if (filters.clase && !normalizeText(item.clase).includes(filters.clase)) return false;
    if (filters.q) {
      var haystack = normalizeText(item.title + " " + item.location + " " + item.clase);
      if (!haystack.includes(filters.q)) return false;
    }
    if (filters.min && item.price < filters.min) return false;
    if (filters.max && item.price > filters.max) return false;
    if (filters.hab && item.bedrooms < filters.hab) return false;
    return true;
  }

  function writeQueryFromFilters(filters) {
    var params = new URLSearchParams();
    Object.keys(filters).forEach(function (key) {
      var value = filters[key];
      if (value !== "" && value !== 0 && value !== null && value !== undefined) {
        params.set(key, String(value));
      }
    });
    var next = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    window.history.replaceState({}, "", next);
  }

  function setFormFromQuery(form) {
    var params = new URLSearchParams(window.location.search);
    ["tipo", "q", "clase", "min", "max", "hab"].forEach(function (key) {
      if (params.has(key) && form[key]) form[key].value = params.get(key);
    });
  }

  function initSearch() {
    var form = qs("#searchFilters");
    var grid = qs("#resultsGrid");
    var count = qs("#resultsCount");
    if (!form || !grid || !count) return;

    setFormFromQuery(form);
    var all = getListings();

    function render() {
      var filters = getFiltersFromForm(form);
      var filtered = all.filter(function (item) {
        return passFilters(item, filters);
      });

      count.textContent = filtered.length + " inmuebles";
      if (!filtered.length) {
        grid.innerHTML = '<article class="listing-card"><div class="listing-body"><h3 class="listing-title">No encontramos resultados</h3><p class="listing-location">Ajusta tus filtros e inténtalo de nuevo.</p></div></article>';
      } else {
        grid.innerHTML = filtered.map(cardTemplate).join("");
      }
      writeQueryFromFilters(filters);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      render();
    });

    render();
    initMobileViewToggle();
  }

  function initMobileViewToggle() {
    var toggle = qs(".mobile-map-toggle");
    var mapPane = qs("#mapPane");
    var listPane = qs("#listPane");
    if (!toggle || !mapPane || !listPane) return;

    qsa("button", toggle).forEach(function (button) {
      button.addEventListener("click", function () {
        var view = button.getAttribute("data-view");
        qsa("button", toggle).forEach(function (b) {
          b.classList.toggle("is-active", b === button);
        });
        if (view === "map") {
          document.body.classList.add("show-map");
        } else {
          document.body.classList.remove("show-map");
        }
      });
    });
  }

  function firstFocusable(root) {
    return qs('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', root);
  }

  function initDrawers() {
    var overlay = qs("#overlay");
    var clientsTrigger = qs("#openClients");
    var clientsDrawer = qs("#clientsDrawer");
    var clientsClose = qs("#closeClients");
    var mobileTrigger = qs("#openMobileNav");
    var mobileDrawer = qs("#mobileNavDrawer");
    var mobileClose = qs("#closeMobileNav");
    var activeDrawer = null;
    var activeTrigger = null;
    var previousFocus = null;

    function setOpen(drawer, trigger, open) {
      if (!drawer || !overlay) return;
      if (open) {
        previousFocus = document.activeElement;
        activeDrawer = drawer;
        activeTrigger = trigger || null;
        drawer.hidden = false;
        overlay.hidden = false;
        document.body.classList.add("modal-open");
        if (trigger) trigger.setAttribute("aria-expanded", "true");
        var target = firstFocusable(drawer);
        if (target) target.focus();
      } else {
        drawer.hidden = true;
        overlay.hidden = true;
        document.body.classList.remove("modal-open");
        if (activeTrigger) activeTrigger.setAttribute("aria-expanded", "false");
        if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
        activeDrawer = null;
        activeTrigger = null;
        previousFocus = null;
      }
    }

    if (clientsTrigger && clientsDrawer) {
      clientsTrigger.addEventListener("click", function () {
        if (activeDrawer === clientsDrawer) setOpen(clientsDrawer, clientsTrigger, false);
        else {
          if (activeDrawer) setOpen(activeDrawer, activeTrigger, false);
          setOpen(clientsDrawer, clientsTrigger, true);
        }
      });
    }

    if (clientsClose && clientsDrawer) {
      clientsClose.addEventListener("click", function () {
        setOpen(clientsDrawer, clientsTrigger, false);
      });
    }

    if (mobileTrigger && mobileDrawer) {
      mobileTrigger.addEventListener("click", function () {
        if (activeDrawer === mobileDrawer) setOpen(mobileDrawer, mobileTrigger, false);
        else {
          if (activeDrawer) setOpen(activeDrawer, activeTrigger, false);
          setOpen(mobileDrawer, mobileTrigger, true);
        }
      });
    }

    if (mobileClose && mobileDrawer) {
      mobileClose.addEventListener("click", function () {
        setOpen(mobileDrawer, mobileTrigger, false);
      });
    }

    if (overlay) {
      overlay.addEventListener("click", function () {
        if (activeDrawer) setOpen(activeDrawer, activeTrigger, false);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && activeDrawer) {
        setOpen(activeDrawer, activeTrigger, false);
      }
    });
  }

  function init() {
    initSegmentedControl();
    initDrawers();
    initHome();
    initSearch();
    console.log("GV UI loaded", { hasDrawer: !!document.getElementById("clientsDrawer") });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
