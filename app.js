(function () {
  const WA_LINK = "https://wa.me/573022584900";
  const STORAGE = {
    operation: "gv_operation",
    favorites: "gv_favorites"
  };

  const state = {
    operation: localStorage.getItem(STORAGE.operation) || "arriendo",
    favorites: new Set(JSON.parse(localStorage.getItem(STORAGE.favorites) || "[]")),
    markerMap: new Map(),
    map: null
  };

  const page = document.body.dataset.page || "";

  function money(value) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function toast(message) {
    const node = document.getElementById("appToast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => node.classList.remove("show"), 1800);
  }

  function setOperation(operation) {
    state.operation = operation === "venta" ? "venta" : "arriendo";
    localStorage.setItem(STORAGE.operation, state.operation);
    document.querySelectorAll("[data-op]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.op === state.operation);
    });
  }

  function uniqueBarrios() {
    return Array.from(new Set((window.PROPERTIES || []).map((p) => p.barrio))).sort();
  }

  function fillBarriosDatalist() {
    const barrios = uniqueBarrios();
    ["barriosListHome", "barriosListAvaluo", "barriosListSearch"].forEach((id) => {
      const list = document.getElementById(id);
      if (!list) return;
      list.innerHTML = barrios.map((b) => `<option value="${b}"></option>`).join("");
    });
  }

  function renderPropertyCard(property, compact) {
    const badges = [
      property.nuevo ? '<span class="badge is-new">Nuevo</span>' : "",
      property.destacado ? '<span class="badge is-featured">Destacado</span>' : ""
    ].join("");

    const favActive = state.favorites.has(property.id) ? "is-active" : "";
    const buttonDetail = `<a class="btn btn-secondary" href="./property.html?id=${encodeURIComponent(property.id)}">Ver detalles</a>`;
    const favButton = `<button class="fav-btn ${favActive}" data-fav="${property.id}" type="button" aria-label="Favorito">❤</button>`;

    if (compact) {
      return `
        <article class="result-card" data-card="${property.id}">
          <div class="result-media">
            <img src="${property.imagenes[0].src}" alt="${property.imagenes[0].alt}">
          </div>
          <div class="result-body">
            <div class="result-top">${badges}${favButton}</div>
            <h3>${property.titulo}</h3>
            <p class="price">${money(property.precio)}</p>
            <p class="muted">${property.direccionCorta}</p>
            <p class="specs">${property.habitaciones} hab · ${property.banos} baños · ${property.areaM2} m2</p>
            <div class="card-actions">${buttonDetail}<a class="btn btn-primary" href="${WA_LINK}" target="_blank" rel="noopener">WhatsApp</a></div>
          </div>
        </article>
      `;
    }

    return `
      <article class="property-card" data-card="${property.id}">
        <div class="card-media">
          <img src="${property.imagenes[0].src}" alt="${property.imagenes[0].alt}">
          <div class="media-badges">${badges}</div>
          ${favButton}
        </div>
        <div class="card-body">
          <h3>${property.titulo}</h3>
          <p class="price">${money(property.precio)}</p>
          <p class="muted">${property.barrio} · ${property.tipoInmueble}</p>
          <p class="specs">${property.habitaciones} hab · ${property.banos} baños · ${property.areaM2} m2</p>
          <div class="card-actions">
            ${buttonDetail}
            <a class="btn btn-primary" href="${WA_LINK}" target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </div>
      </article>
    `;
  }

  function filterProperties(filters) {
    return (window.PROPERTIES || []).filter((property) => {
      if (property.tipoOperacion !== state.operation) return false;
      if (filters.barrio && !property.barrio.toLowerCase().includes(filters.barrio.toLowerCase())) return false;
      if (filters.tipo && property.tipoInmueble !== filters.tipo) return false;
      if (filters.min && property.precio < Number(filters.min)) return false;
      if (filters.max && property.precio > Number(filters.max)) return false;
      if (filters.hab && property.habitaciones < Number(filters.hab)) return false;
      return true;
    });
  }

  function emptyState(label) {
    return `
      <div class="empty-state">
        <h3>Sin ${label} disponibles con estos filtros</h3>
        <p>Ajusta filtros o contáctanos para una búsqueda asistida.</p>
        <a class="btn btn-primary" href="${WA_LINK}" target="_blank" rel="noopener">Solicitar asesoría</a>
      </div>
    `;
  }

  function renderHomeFeatured() {
    const grid = document.getElementById("homeFeaturedGrid");
    if (!grid) return;
    const featuredOpButtons = document.querySelectorAll("[data-featured-op]");
    featuredOpButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.featuredOp === state.operation));

    const all = window.PROPERTIES || [];
    const arCount = all.filter((p) => p.tipoOperacion === "arriendo").length;
    const veCount = all.filter((p) => p.tipoOperacion === "venta").length;
    const cA = document.getElementById("countArriendo");
    const cV = document.getElementById("countVenta");
    if (cA) cA.textContent = String(arCount);
    if (cV) cV.textContent = String(veCount);

    const props = all.filter((p) => p.tipoOperacion === state.operation).slice(0, 6);
    grid.innerHTML = props.length ? props.map((p) => renderPropertyCard(p, false)).join("") : emptyState(state.operation);
    bindFavoriteButtons();
  }

  function renderSearchResults(filters) {
    const list = document.getElementById("searchResultsList");
    if (!list) return [];
    const found = filterProperties(filters);
    const counter = document.getElementById("searchCounter");
    if (counter) counter.textContent = `${found.length} resultados en Cali`;

    list.innerHTML = found.length
      ? found.map((p) => renderPropertyCard(p, true)).join("")
      : emptyState(state.operation === "arriendo" ? "arriendos" : "ventas");
    bindFavoriteButtons();
    bindCardMarkerHover(found);
    return found;
  }

  function createMapIfNeeded(nodeId, center) {
    const node = document.getElementById(nodeId);
    if (!node || typeof L === "undefined") return null;
    if (state.map) return state.map;

    state.map = L.map(nodeId, { zoomControl: true }).setView(center, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(state.map);
    return state.map;
  }

  function renderMapMarkers(properties) {
    const mapNode = document.getElementById("searchMap");
    if (!mapNode || typeof L === "undefined") return;
    const map = createMapIfNeeded("searchMap", [3.4516, -76.5320]);
    if (!map) return;

    state.markerMap.forEach((marker) => marker.remove());
    state.markerMap.clear();

    properties.forEach((property) => {
      const marker = L.circleMarker([property.lat, property.lng], {
        radius: 8,
        color: "#0B1F33",
        fillColor: "#0B1F33",
        fillOpacity: 0.9,
        weight: 2
      }).addTo(map);
      marker.bindTooltip(`${property.titulo}<br>${money(property.precio)}`);
      marker.on("click", () => {
        const card = document.querySelector(`[data-card="${property.id}"]`);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("is-focus");
          window.setTimeout(() => card.classList.remove("is-focus"), 1300);
        }
      });
      marker.on("mouseover", () => {
        const card = document.querySelector(`[data-card="${property.id}"]`);
        if (card) card.classList.add("is-focus");
      });
      marker.on("mouseout", () => {
        const card = document.querySelector(`[data-card="${property.id}"]`);
        if (card) card.classList.remove("is-focus");
      });
      state.markerMap.set(property.id, marker);
    });

    if (properties.length) {
      const bounds = L.latLngBounds(properties.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds.pad(0.2));
    }
  }

  function bindCardMarkerHover(properties) {
    properties.forEach((property) => {
      const card = document.querySelector(`[data-card="${property.id}"]`);
      const marker = state.markerMap.get(property.id);
      if (!card || !marker) return;

      const enter = () => marker.setStyle({ fillColor: "#B76A2A", color: "#B76A2A", radius: 10 });
      const leave = () => marker.setStyle({ fillColor: "#0B1F33", color: "#0B1F33", radius: 8 });
      card.addEventListener("mouseenter", enter);
      card.addEventListener("mouseleave", leave);
    });
  }

  function bindHeroTabsAndSegmentedControl() {
    document.querySelectorAll("[data-hero-panel]").forEach((tab) => {
      tab.addEventListener("click", () => {
        const panelName = tab.dataset.heroPanel;
        document.querySelectorAll("[data-hero-panel]").forEach((btn) => btn.classList.remove("is-active"));
        document.querySelectorAll("[data-hero-content]").forEach((panel) => panel.classList.remove("is-active"));
        tab.classList.add("is-active");
        const panel = document.querySelector(`[data-hero-content="${panelName}"]`);
        if (panel) panel.classList.add("is-active");
      });
    });

    document.querySelectorAll("[data-op]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setOperation(btn.dataset.op);
        renderHomeFeatured();
      });
    });

    document.querySelectorAll("[data-featured-op]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setOperation(btn.dataset.featuredOp);
        renderHomeFeatured();
      });
    });
  }

  function bindFavoriteButtons() {
    document.querySelectorAll("[data-fav]").forEach((button) => {
      button.onclick = () => {
        const id = button.dataset.fav;
        if (state.favorites.has(id)) {
          state.favorites.delete(id);
          toast("Eliminado de favoritos");
        } else {
          state.favorites.add(id);
          toast("Guardado en favoritos");
        }
        localStorage.setItem(STORAGE.favorites, JSON.stringify(Array.from(state.favorites)));
        button.classList.toggle("is-active", state.favorites.has(id));
      };
    });
  }

  function bindHeaderMenu() {
    const open = document.getElementById("mobileMenuOpen");
    const close = document.getElementById("mobileMenuClose");
    const drawer = document.getElementById("mobileDrawer");
    if (open && drawer) {
      open.addEventListener("click", () => {
        drawer.classList.add("is-open");
        drawer.setAttribute("aria-hidden", "false");
      });
    }
    if (close && drawer) {
      close.addEventListener("click", () => {
        drawer.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
      });
    }

    document.querySelectorAll("[data-dropdown]").forEach((holder) => {
      const trigger = holder.querySelector(".dropdown-toggle");
      if (!trigger) return;
      trigger.addEventListener("click", () => {
        holder.classList.toggle("is-open");
        trigger.setAttribute("aria-expanded", String(holder.classList.contains("is-open")));
      });
    });

    document.addEventListener("click", (event) => {
      document.querySelectorAll("[data-dropdown].is-open").forEach((holder) => {
        if (!holder.contains(event.target)) {
          holder.classList.remove("is-open");
          const trigger = holder.querySelector(".dropdown-toggle");
          if (trigger) trigger.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  function bindHomeForms() {
    const form = document.getElementById("heroSearchForm");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const query = new URLSearchParams({
          op: state.operation,
          barrio: document.getElementById("heroBarrio")?.value || "",
          tipo: document.getElementById("heroTipo")?.value || "",
          min: document.getElementById("heroPrecioMin")?.value || "",
          max: document.getElementById("heroPrecioMax")?.value || "",
          hab: document.getElementById("heroHab")?.value || ""
        });
        window.location.href = `./search.html?${query.toString()}`;
      });
    }

    const appraisal = document.getElementById("appraisalForm");
    if (appraisal) {
      appraisal.addEventListener("submit", (event) => {
        event.preventDefault();
        const payload = {
          tipo: document.getElementById("avTipo")?.value || "-",
          barrio: document.getElementById("avBarrio")?.value || "-",
          area: document.getElementById("avArea")?.value || "-",
          hab: document.getElementById("avHab")?.value || "-",
          banos: document.getElementById("avBanos")?.value || "-",
          contacto: document.getElementById("avContacto")?.value || "-"
        };
        const message = encodeURIComponent(
          `Hola Grupo Versa, deseo solicitar un avalúo.\nTipo: ${payload.tipo}\nBarrio/Sector: ${payload.barrio}\nÁrea m2: ${payload.area}\nHabitaciones: ${payload.hab}\nBaños: ${payload.banos}\nContacto: ${payload.contacto}`
        );
        window.open(`${WA_LINK}?text=${message}`, "_blank", "noopener");
      });
    }
  }

  function bindSearchPage() {
    const apply = document.getElementById("searchApplyBtn");
    if (!apply) return;

    const params = new URLSearchParams(window.location.search);
    const urlOp = params.get("op");
    setOperation(urlOp || state.operation);

    const controls = {
      barrio: document.getElementById("searchBarrio"),
      tipo: document.getElementById("searchTipo"),
      min: document.getElementById("searchMin"),
      max: document.getElementById("searchMax"),
      hab: document.getElementById("searchHab")
    };

    controls.barrio.value = params.get("barrio") || "";
    controls.tipo.value = params.get("tipo") || "";
    controls.min.value = params.get("min") || "";
    controls.max.value = params.get("max") || "";
    controls.hab.value = params.get("hab") || "";

    function run() {
      const filters = {
        barrio: controls.barrio.value.trim(),
        tipo: controls.tipo.value,
        min: controls.min.value,
        max: controls.max.value,
        hab: controls.hab.value
      };
      const result = renderSearchResults(filters);
      renderMapMarkers(result);
    }

    document.querySelectorAll("[data-op]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setOperation(btn.dataset.op);
        run();
      });
    });

    apply.addEventListener("click", run);
    run();

    const showList = document.getElementById("showListBtn");
    const showMap = document.getElementById("showMapBtn");
    const results = document.getElementById("resultsPanel");
    const map = document.getElementById("mapPanel");
    if (showList && showMap && results && map) {
      if (window.matchMedia("(max-width: 880px)").matches) {
        results.classList.remove("is-hidden-mobile");
        map.classList.add("is-hidden-mobile");
      }
      showList.addEventListener("click", () => {
        showList.classList.add("is-active");
        showMap.classList.remove("is-active");
        results.classList.remove("is-hidden-mobile");
        map.classList.add("is-hidden-mobile");
      });
      showMap.addEventListener("click", () => {
        showMap.classList.add("is-active");
        showList.classList.remove("is-active");
        map.classList.remove("is-hidden-mobile");
        results.classList.add("is-hidden-mobile");
        if (state.map) state.map.invalidateSize();
      });
    }
  }

  function bindPropertyPage() {
    if (page !== "property") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const property = (window.PROPERTIES || []).find((p) => p.id === id) || window.PROPERTIES[0];
    if (!property) return;

    const mainImage = document.getElementById("detailMainImage");
    const thumbs = document.getElementById("detailThumbs");
    const title = document.getElementById("detailTitle");
    const price = document.getElementById("detailPrice");
    const specs = document.getElementById("detailSpecs");
    const description = document.getElementById("detailDescription");
    const amenities = document.getElementById("detailAmenities");
    const table = document.getElementById("detailTable");
    const similar = document.getElementById("similarProperties");

    if (mainImage) {
      mainImage.src = property.imagenes[0].src;
      mainImage.alt = property.imagenes[0].alt;
    }
    if (thumbs) {
      thumbs.innerHTML = property.imagenes.map((img, index) => (
        `<button type="button" class="thumb-btn" data-thumb="${index}"><img src="${img.src}" alt="${img.alt}"></button>`
      )).join("");
      thumbs.querySelectorAll("[data-thumb]").forEach((button) => {
        button.addEventListener("click", () => {
          const img = property.imagenes[Number(button.dataset.thumb)];
          if (!img || !mainImage) return;
          mainImage.src = img.src;
          mainImage.alt = img.alt;
        });
      });
    }

    if (title) title.textContent = property.titulo;
    if (price) price.textContent = money(property.precio);
    if (specs) specs.textContent = `${property.habitaciones} hab · ${property.banos} baños · ${property.areaM2} m2 · Estrato ${property.estrato}`;
    if (description) description.textContent = property.descripcion;
    if (amenities) amenities.innerHTML = property.amenidades.map((item) => `<li>${item}</li>`).join("");

    if (table) {
      table.innerHTML = `
        <tr><th>Código</th><td>${property.codigo}</td></tr>
        <tr><th>Operación</th><td>${property.tipoOperacion}</td></tr>
        <tr><th>Tipo</th><td>${property.tipoInmueble}</td></tr>
        <tr><th>Barrio</th><td>${property.barrio}</td></tr>
        <tr><th>Parqueadero</th><td>${property.parqueadero}</td></tr>
        <tr><th>Dirección corta</th><td>${property.direccionCorta}</td></tr>
      `;
    }

    if (similar) {
      const related = (window.PROPERTIES || [])
        .filter((item) => item.id !== property.id && item.tipoOperacion === property.tipoOperacion)
        .slice(0, 3);
      similar.innerHTML = related.length ? related.map((item) => renderPropertyCard(item, false)).join("") : emptyState("inmuebles similares");
      bindFavoriteButtons();
    }

    const waMessage = encodeURIComponent(`Hola Grupo Versa, me interesa el inmueble ${property.codigo} - ${property.titulo}.`);
    const waBtn = document.getElementById("detailWhatsapp");
    const visitBtn = document.getElementById("detailVisit");
    if (waBtn) waBtn.href = `${WA_LINK}?text=${waMessage}`;
    if (visitBtn) visitBtn.href = `${WA_LINK}?text=${encodeURIComponent(`Hola Grupo Versa, quiero solicitar visita para ${property.codigo}.`)}`;

    if (typeof L !== "undefined") {
      const map = L.map("propertyMap").setView([property.lat, property.lng], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);
      L.marker([property.lat, property.lng]).addTo(map);
    }
  }

  function init() {
    bindHeaderMenu();
    fillBarriosDatalist();
    setOperation(state.operation);
    bindHeroTabsAndSegmentedControl();
    bindHomeForms();
    bindSearchPage();
    bindPropertyPage();
    if (page === "home") renderHomeFeatured();
  }

  init();
})();
