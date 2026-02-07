const FAVORITES_KEY = 'gv_favorites';
const formatCOP = value => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0));
const getFavorites = () => JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
const setFavorites = ids => localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
const isFav = id => getFavorites().includes(id);

let currentSearchResults = [];

const ICONS = {
  bed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18v7h-2v-2H5v2H3v-7Zm2-4a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v2H5V8Zm10 0a3 3 0 0 1 3-3h1a2 2 0 0 1 2 2v3h-6V8Z"/></svg>',
  bath: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11h16a1 1 0 0 1 1 1v2a5 5 0 0 1-5 5v2h-2v-2h-4v2H8v-2a5 5 0 0 1-5-5v-2a1 1 0 0 1 1-1Zm2-3a3 3 0 0 1 6 0v1H6V8Zm8 1V8a5 5 0 0 0-10 0v1h10Z"/></svg>',
  area: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM4 14h2v4h4v2H4v-6Zm14 0h2v6h-6v-2h4v-4Z"/></svg>',
  park: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h7a5 5 0 0 1 0 10H9v8H6V3Zm3 3v4h4a2 2 0 1 0 0-4H9Z"/></svg>'
};

function showToast(message = 'Guardado en favoritos') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1600);
}

function buildWhatsAppLink(property) {
  const msg = encodeURIComponent(
    `Hola Grupo Versa, me interesa este inmueble:\n` +
    `Código: ${property.codigo}\n` +
    `Gestión: ${property.gestion}\n` +
    `Ubicación: ${property.ciudad} - ${property.zona}\n` +
    `Precio: ${formatCOP(property.precio)}\n` +
    `Link: https://grupoversa.com.co/inmueble/${property.codigo}`
  );
  return `https://wa.me/57XXXXXXXXXX?text=${msg}`;
}

function toggleFavorite(id) {
  const favorites = getFavorites();
  const exists = favorites.includes(id);
  const updated = exists ? favorites.filter(item => item !== id) : [...favorites, id];
  setFavorites(updated);
  showToast(exists ? 'Eliminado de favoritos' : 'Guardado en favoritos');
  renderHomeFeatured();
  renderSearchResults();
}

function propertyBadges(property) {
  const badges = [];
  if (property.destacado) badges.push('<span class="badge badge-dark">Destacado</span>');
  if (property.nuevo) badges.push('<span class="badge badge-accent">Nuevo</span>');
  return badges.join('');
}

function propertySpecs(property) {
  return `
    <li><span class="spec-icon">${ICONS.bed}</span>${property.habitaciones || '-'} hab</li>
    <li><span class="spec-icon">${ICONS.bath}</span>${property.banos || '-'} baños</li>
    <li><span class="spec-icon">${ICONS.area}</span>${property.area} m²</li>
    <li><span class="spec-icon">${ICONS.park}</span>${property.parqueadero ?? '-'} parqueadero</li>
  `;
}

function createHomeCard(property) {
  const card = document.createElement('article');
  card.className = 'property-card';
  card.innerHTML = `
    <div class="property-media">
      <img src="${property.imagen}" alt="${property.titulo}" loading="lazy">
      <div class="media-badges">${propertyBadges(property)}</div>
      <button class="save-btn ${isFav(property.id) ? 'active' : ''}" data-fav-id="${property.id}" aria-label="Guardar inmueble">❤ Guardar</button>
    </div>
    <div class="property-content">
      <p class="price">${formatCOP(property.precio)}</p>
      <h3>${property.titulo}</h3>
      <p class="meta">${property.ciudad}, ${property.zona} · ${property.direccionCorta}</p>
      <ul class="spec-list">${propertySpecs(property)}</ul>
      <div class="card-foot"><span>Código ${property.codigo}</span><a class="link-arrow" href="search.html?gestion=${property.gestion}&ciudad=${encodeURIComponent(property.zona)}">Ver detalles</a></div>
    </div>
  `;
  return card;
}

function createSearchCard(property) {
  const card = document.createElement('article');
  card.className = 'result-card';
  card.dataset.pinId = `pin-${property.id}`;
  card.innerHTML = `
    <div class="result-media">
      <img src="${property.imagen}" alt="${property.titulo}" loading="lazy">
      <div class="media-badges">${propertyBadges(property)}</div>
    </div>
    <div class="result-body">
      <div class="result-head">
        <p class="price">${formatCOP(property.precio)}</p>
        <button class="save-btn ${isFav(property.id) ? 'active' : ''}" data-fav-id="${property.id}" aria-label="Guardar inmueble">❤ Guardar</button>
      </div>
      <h3>${property.titulo}</h3>
      <p class="meta">${property.ciudad}, ${property.zona} · ${property.direccionCorta}</p>
      <ul class="spec-list">${propertySpecs(property)}</ul>
      <div class="result-foot">
        <span>Estrato ${property.estrato ?? 'N/A'} · Código ${property.codigo}</span>
        <a class="btn btn-primary" target="_blank" rel="noopener" href="${buildWhatsAppLink(property)}">WhatsApp / Agendar visita</a>
      </div>
    </div>
  `;
  card.addEventListener('mouseenter', () => setActivePin(property.id));
  card.addEventListener('mouseleave', () => setActivePin(null));
  return card;
}

function attachFavoriteEvents(scope = document) {
  scope.querySelectorAll('[data-fav-id]').forEach(btn => {
    btn.onclick = () => toggleFavorite(Number(btn.dataset.favId));
  });
}

function renderHomeFeatured() {
  const container = document.getElementById('featured-list');
  if (!container) return;
  const featured = PROPERTIES.filter(p => p.gestion === 'arriendo').sort((a, b) => Number(b.destacado) - Number(a.destacado)).slice(0, 8);
  container.innerHTML = '';
  featured.forEach(p => container.appendChild(createHomeCard(p)));
  attachFavoriteEvents(container);
}

function getSearchFilters() {
  const pick = id => document.getElementById(id)?.value || '';
  return {
    gestion: pick('gestion'),
    tipo: pick('tipo'),
    ciudad: pick('ciudad'),
    precioMin: Number(pick('precioMin') || 0),
    precioMax: Number(pick('precioMax') || Number.MAX_SAFE_INTEGER),
    habitaciones: Number(pick('habitaciones') || 0),
    banos: Number(pick('banos') || 0),
    areaMin: Number(pick('areaMin') || 0),
    areaMax: Number(pick('areaMax') || Number.MAX_SAFE_INTEGER)
  };
}

function applyFilters(properties, filters) {
  return properties.filter(p =>
    (!filters.gestion || p.gestion === filters.gestion) &&
    (!filters.tipo || p.tipo === filters.tipo) &&
    (!filters.ciudad || `${p.ciudad} ${p.zona}`.toLowerCase().includes(filters.ciudad.toLowerCase())) &&
    p.precio >= filters.precioMin && p.precio <= filters.precioMax &&
    (!filters.habitaciones || p.habitaciones >= filters.habitaciones) &&
    (!filters.banos || p.banos >= filters.banos) &&
    p.area >= filters.areaMin && p.area <= filters.areaMax
  );
}

function renderMapPins(results) {
  const map = document.getElementById('map-pins');
  if (!map) return;
  map.innerHTML = '';
  results.forEach((property, index) => {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'map-pin';
    pin.id = `pin-${property.id}`;
    pin.style.left = `${18 + (index * 17) % 64}%`;
    pin.style.top = `${20 + (index * 13) % 62}%`;
    pin.textContent = formatCOP(property.precio).replace(',00', '');
    pin.addEventListener('mouseenter', () => setActiveCard(property.id));
    pin.addEventListener('mouseleave', () => setActiveCard(null));
    map.appendChild(pin);
  });
}

function setActivePin(id) {
  document.querySelectorAll('.map-pin').forEach(pin => pin.classList.toggle('active', pin.id === `pin-${id}`));
}

function setActiveCard(id) {
  document.querySelectorAll('.result-card').forEach(card => card.classList.toggle('active', card.dataset.pinId === `pin-${id}`));
}

function updateFilterChips(filters) {
  const wrap = document.getElementById('selected-filters');
  if (!wrap) return;
  const chips = [];
  if (filters.gestion) chips.push(`Gestión: ${filters.gestion}`);
  if (filters.tipo) chips.push(`Tipo: ${filters.tipo}`);
  if (filters.ciudad) chips.push(`Zona: ${filters.ciudad}`);
  if (filters.precioMin > 0) chips.push(`Desde ${formatCOP(filters.precioMin)}`);
  if (filters.precioMax < Number.MAX_SAFE_INTEGER) chips.push(`Hasta ${formatCOP(filters.precioMax)}`);
  if (filters.habitaciones) chips.push(`${filters.habitaciones}+ hab`);
  if (filters.banos) chips.push(`${filters.banos}+ baños`);
  if (filters.areaMin) chips.push(`Área desde ${filters.areaMin}m²`);
  wrap.innerHTML = chips.length ? chips.map(c => `<span class="chip">${c}</span>`).join('') : '<span class="chip">Sin filtros</span>';
}

function renderSearchResults() {
  const container = document.getElementById('search-results');
  if (!container) return;
  const filters = getSearchFilters();
  const results = applyFilters(PROPERTIES, filters);
  currentSearchResults = results;

  const count = document.getElementById('results-count');
  if (count) count.textContent = `${results.length} inmuebles`;
  updateFilterChips(filters);

  container.innerHTML = '';
  if (!results.length) {
    container.innerHTML = '<div class="panel"><p>No encontramos inmuebles con esos filtros. Ajusta criterios e inténtalo de nuevo.</p></div>';
    renderMapPins([]);
    return;
  }

  results.forEach(p => container.appendChild(createSearchCard(p)));
  attachFavoriteEvents(container);
  renderMapPins(results);
}

function syncGestionTabs() {
  const tabs = document.querySelectorAll('[data-gestion-tab]');
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const input = document.getElementById('gestion');
      if (input) input.value = tab.dataset.gestionTab;
    });
  });
}

function setupForms() {
  const consignForm = document.getElementById('consign-form');
  if (consignForm) {
    consignForm.addEventListener('submit', e => {
      e.preventDefault();
      document.getElementById('consign-notice')?.classList.add('show');
      consignForm.reset();
    });
  }

  const homeSearch = document.getElementById('home-search');
  if (homeSearch) {
    homeSearch.addEventListener('submit', e => {
      e.preventDefault();
      const params = new URLSearchParams(new FormData(homeSearch));
      window.location.href = `search.html?${params.toString()}`;
    });
  }
}

function hydrateSearchFromQuery() {
  const params = new URLSearchParams(window.location.search);
  ['gestion', 'tipo', 'ciudad', 'precioMin', 'precioMax', 'habitaciones', 'banos', 'areaMin', 'areaMax'].forEach(key => {
    const el = document.getElementById(key);
    if (el && params.get(key)) el.value = params.get(key);
  });
}

function setupSearchInteractions() {
  const form = document.getElementById('search-form');
  if (form) {
    form.addEventListener('input', renderSearchResults);
    form.addEventListener('submit', e => { e.preventDefault(); renderSearchResults(); });
  }

  const listBtn = document.getElementById('view-list');
  const mapBtn = document.getElementById('view-map');
  const shell = document.getElementById('search-shell');
  if (listBtn && mapBtn && shell) {
    listBtn.onclick = () => { listBtn.classList.add('active'); mapBtn.classList.remove('active'); shell.classList.remove('show-map'); };
    mapBtn.onclick = () => { mapBtn.classList.add('active'); listBtn.classList.remove('active'); shell.classList.add('show-map'); };
  }

  const open = document.getElementById('open-filters');
  const close = document.getElementById('close-filters');
  const drawer = document.getElementById('filters-drawer');
  if (open && close && drawer) {
    open.onclick = () => drawer.classList.add('open');
    close.onclick = () => drawer.classList.remove('open');
    drawer.addEventListener('click', e => { if (e.target === drawer) drawer.classList.remove('open'); });
  }
}


function setupHeaderUI() {
  const header = document.querySelector('.site-header');
  const toggle = document.getElementById('nav-toggle');
  if (header && toggle) {
    toggle.addEventListener('click', () => header.classList.toggle('menu-open'));
  }

  document.querySelectorAll('.dropdown-toggle').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const drop = btn.closest('.dropdown');
      if (!drop) return;
      const isOpen = drop.classList.contains('open');
      document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
      if (!isOpen) drop.classList.add('open');
    });
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
    }
  });
}

function setupClientTabs() {
  const tabButtons = document.querySelectorAll('[data-client-tab]');
  if (!tabButtons.length) return;
  const blocks = document.querySelectorAll('.client-block');
  const activate = target => {
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.clientTab === target));
    blocks.forEach(block => block.classList.toggle('active', block.id === `${target}-block`));
  };
  tabButtons.forEach(btn => btn.onclick = () => activate(btn.dataset.clientTab));
}

document.addEventListener('DOMContentLoaded', () => {
  setupHeaderUI();
  syncGestionTabs();
  setupForms();
  hydrateSearchFromQuery();
  setupSearchInteractions();
  setupClientTabs();
  renderHomeFeatured();
  renderSearchResults();
});
(() => {
  const NAV_ITEMS = [
    { label: "Arriendos", href: "./search.html?tipo=arriendo" },
    { label: "Ventas", href: "./search.html?tipo=venta" },
    { label: "Consigne", href: "./about.html#consigne" },
    { label: "Servicios", href: "./about.html#servicios" },
  ];

  const ZONA_LINKS = {
    arrendatarios: [
      { label: "Pagar canon en línea", href: "./clients.html#arrendatarios-pagos" },
      { label: "Solicitar soporte", href: "./clients.html#arrendatarios-soporte" },
      { label: "Descargar certificados", href: "./clients.html#arrendatarios-certificados" },
    ],
    propietarios: [
      { label: "Ver reportes", href: "./clients.html#propietarios-reportes" },
      { label: "Estado de pagos", href: "./clients.html#propietarios-pagos" },
      { label: "Solicitudes y PQRS", href: "./clients.html#propietarios-soporte" },
    ],
  };

  const DEFAULT_WHATSAPP = "https://wa.me/573000000000?text=Hola%2C%20quiero%20asesoria%20inmobiliaria";

  const createEl = (tag, className, html) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html) el.innerHTML = html;
    return el;
  };

  const pathname = () => {
    const p = window.location.pathname.split("/").pop();
    return p || "index.html";
  };

  const getBrandText = () => {
    const guess = document.querySelector(".logo, .brand, [data-logo], header h1, header .title");
    const text = guess ? (guess.textContent || "").trim() : "";
    return text || "Inmobiliaria";
  };

  const getWhatsAppHref = () => {
    const existing = document.querySelector('a[href*="wa.me"],a[href*="whatsapp"]');
    return existing ? existing.getAttribute("href") || DEFAULT_WHATSAPP : DEFAULT_WHATSAPP;
  };

  const setActiveNav = () => {
    const page = pathname();
    document.querySelectorAll(".main-nav a").forEach((a) => {
      const href = (a.getAttribute("href") || "").split("?")[0];
      if (page === "search.html" && href.endsWith("search.html")) {
        a.setAttribute("aria-current", "page");
      } else if (page === "about.html" && href.endsWith("about.html")) {
        a.setAttribute("aria-current", "page");
      } else if (page === "index.html" && href.endsWith("index.html")) {
        a.setAttribute("aria-current", "page");
      }
    });
  };

  const mountHeader = () => {
    if (document.querySelector(".site-header")) return;

    const brand = getBrandText();
    const waHref = getWhatsAppHref();

    const header = createEl("header", "site-header");
    header.setAttribute("role", "banner");
    header.innerHTML = `
      <div class="site-header__bar">
        <div class="site-header__left">
          <button class="mobile-menu-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="mobile-drawer">☰</button>
          <nav class="main-nav" aria-label="Principal">
            ${NAV_ITEMS.map((n) => `<a href="${n.href}">${n.label}</a>`).join("")}
          </nav>
        </div>
        <div class="site-header__center">
          <a class="site-logo" href="./index.html" aria-label="Ir al inicio">${brand}</a>
        </div>
        <div class="site-header__right">
          <button id="zoneClientsTrigger" class="btn btn-secondary" aria-haspopup="dialog" aria-controls="zona-clientes-modal">Zona clientes</button>
          <a class="btn btn-primary" href="${waHref}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a class="btn btn-primary mobile-whatsapp" href="${waHref}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">WA</a>
        </div>
      </div>
    `;

    const currentHeader = document.querySelector("body > header");
    if (currentHeader && !currentHeader.classList.contains("site-header")) {
      currentHeader.style.display = "none";
      currentHeader.setAttribute("aria-hidden", "true");
    }
    document.body.insertBefore(header, document.body.firstChild);
    setActiveNav();
  };

  const mountMobileDrawer = () => {
    if (document.getElementById("mobile-drawer")) return;
    const drawer = createEl("div", "mobile-drawer");
    drawer.id = "mobile-drawer";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `
      <div class="mobile-drawer__backdrop" data-close-drawer="true"></div>
      <div class="mobile-drawer__panel" role="dialog" aria-label="Menú móvil">
        <h3>Navegación</h3>
        <div class="mobile-drawer__links">
          ${NAV_ITEMS.map((n) => `<a href="${n.href}">${n.label}</a>`).join("")}
        </div>
        <h3>Zona clientes</h3>
        <div class="mobile-drawer__links">
          ${ZONA_LINKS.arrendatarios.map((n) => `<a href="${n.href}">${n.label}</a>`).join("")}
          ${ZONA_LINKS.propietarios.map((n) => `<a href="${n.href}">${n.label}</a>`).join("")}
        </div>
      </div>
    `;
    document.body.appendChild(drawer);

    const toggle = document.querySelector(".mobile-menu-toggle");
    const openDrawer = () => {
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    };
    const closeDrawer = () => {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };

    if (toggle) {
      toggle.addEventListener("click", () => {
        if (drawer.classList.contains("is-open")) closeDrawer();
        else openDrawer();
      });
    }

    drawer.addEventListener("click", (event) => {
      const t = event.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.matches("[data-close-drawer='true'], .mobile-drawer a")) closeDrawer();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
    });
  };

  const mountZoneClientsModal = () => {
    if (document.getElementById("zona-clientes-modal")) return;

    const modal = createEl("div", "zone-modal");
    modal.id = "zona-clientes-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="zone-modal__backdrop" data-close-modal="true"></div>
      <div class="zone-modal__card" role="dialog" aria-modal="true" aria-labelledby="zona-clientes-title">
        <div class="zone-modal__header">
          <h3 id="zona-clientes-title">Zona clientes</h3>
          <button class="zone-modal__close" aria-label="Cerrar zona clientes" data-close-modal="true">×</button>
        </div>
        <div class="clients-groups">
          <article class="client-group">
            <h3>Arrendatarios</h3>
            <p>Gestiona pagos, solicitudes y documentos de forma rápida.</p>
            ${ZONA_LINKS.arrendatarios.map((n) => `<a href="${n.href}">${n.label}</a>`).join("")}
          </article>
          <article class="client-group">
            <h3>Propietarios</h3>
            <p>Revisa reportes, estado de cartera y solicitudes de servicio.</p>
            ${ZONA_LINKS.propietarios.map((n) => `<a href="${n.href}">${n.label}</a>`).join("")}
          </article>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const trigger = document.getElementById("zoneClientsTrigger");
    const open = () => {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };

    if (trigger) trigger.addEventListener("click", open);
    modal.addEventListener("click", (event) => {
      const t = event.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.matches("[data-close-modal='true']")) close();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) close();
    });
  };

  const upgradeHero = () => {
    if (pathname() !== "index.html") return;
    const hero = document.querySelector(".hero, .home-hero, .banner, section");
    if (!hero || !(hero instanceof HTMLElement)) return;
    hero.classList.add("premium-hero");

    const form = hero.querySelector("form");
    if (form) {
      form.classList.add("search-pill");
      if (!form.querySelector(".segment-control")) {
        const segment = createEl("div", "segment-control");
        const btnRent = createEl("button", "is-active");
        btnRent.type = "button";
        btnRent.textContent = "Arriendo";
        btnRent.setAttribute("aria-pressed", "true");
        const btnSale = createEl("button", "");
        btnSale.type = "button";
        btnSale.textContent = "Venta";
        btnSale.setAttribute("aria-pressed", "false");

        const hidden = createEl("input", "");
        hidden.type = "hidden";
        hidden.name = "tipo";
        hidden.value = "arriendo";

        const activate = (isRent) => {
          btnRent.classList.toggle("is-active", isRent);
          btnRent.setAttribute("aria-pressed", isRent ? "true" : "false");
          btnSale.classList.toggle("is-active", !isRent);
          btnSale.setAttribute("aria-pressed", !isRent ? "true" : "false");
          hidden.value = isRent ? "arriendo" : "venta";
        };
        btnRent.addEventListener("click", () => activate(true));
        btnSale.addEventListener("click", () => activate(false));

        segment.appendChild(btnRent);
        segment.appendChild(btnSale);
        segment.appendChild(hidden);
        form.prepend(segment);
      }
    }
  };

  const specIcon = (kind) => {
    if (kind === "hab") {
      return '<svg class="spec-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 11h16v8h-2v-2H6v2H4v-8Zm2-6h5a3 3 0 0 1 3 3v1H4V7a2 2 0 0 1 2-2Zm10 1h2a2 2 0 0 1 2 2v1h-4V6Z"/></svg>';
    }
    if (kind === "banos") {
      return '<svg class="spec-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 3h6v2H9v4h8a3 3 0 0 1 3 3v1h1v2h-1a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V7a4 4 0 0 1 4-4Z"/></svg>';
    }
    return '<svg class="spec-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 3h8v2H5v6H3V3Zm18 0v8h-2V5h-6V3h8ZM3 21v-8h2v6h6v2H3Zm18-8v8h-8v-2h6v-6h2Z"/></svg>';
  };

  const polishCards = () => {
    const cards = document.querySelectorAll(".card, .property-card, .listing-card, .result-card, .property-item, article");
    cards.forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      if (card.querySelector("img")) {
        card.classList.add("listing-card");
      }

      const text = card.textContent ? card.textContent.toLowerCase() : "";
      if (text.includes("nuevo") || text.includes("destacado")) {
        let badgeRow = card.querySelector(".badge-row");
        if (!badgeRow) {
          badgeRow = createEl("div", "badge-row");
          card.style.position = "relative";
          card.prepend(badgeRow);
        }
        if (text.includes("nuevo") && !badgeRow.querySelector(".badge-new")) {
          badgeRow.insertAdjacentHTML("beforeend", '<span class="badge badge-new">Nuevo</span>');
        }
        if (text.includes("destacado") && !badgeRow.querySelector(".badge-featured")) {
          badgeRow.insertAdjacentHTML("beforeend", '<span class="badge badge-featured">Destacado</span>');
        }
      }

      const specs = card.querySelector(".specs, .spec-row, .property-specs, .listing-specs");
      if (specs) {
        specs.querySelectorAll("span, li, div").forEach((item) => {
          if (!(item instanceof HTMLElement)) return;
          const t = (item.textContent || "").toLowerCase();
          if (item.querySelector(".spec-icon")) return;
          if (t.includes("hab")) item.insertAdjacentHTML("afterbegin", specIcon("hab"));
          else if (t.includes("ba") || t.includes("ban")) item.insertAdjacentHTML("afterbegin", specIcon("banos"));
          else if (t.includes("m2") || t.includes("área") || t.includes("area")) item.insertAdjacentHTML("afterbegin", specIcon("area"));
          item.classList.add("spec-item");
        });
      }
    });
  };

  const polishClientsPage = () => {
    if (pathname() !== "clients.html") return;
    const main = document.querySelector("main") || document.body;
    if (!(main instanceof HTMLElement)) return;
    main.classList.add("clients-page");

    const existing = document.querySelector(".clients-groups");
    if (existing) return;

    const panel = createEl("section", "clients-portal section");
    panel.innerHTML = `
      <div class="section-title-row">
        <div>
          <h2>Zona clientes</h2>
          <p>Accesos directos para arrendatarios y propietarios.</p>
        </div>
      </div>
      <div class="clients-groups">
        <article class="client-group" id="arrendatarios-pagos">
          <h3>Arrendatarios</h3>
          <p>Pagos, soporte y certificados.</p>
          ${ZONA_LINKS.arrendatarios.map((n) => `<a href="${n.href}">${n.label}</a>`).join("")}
        </article>
        <article class="client-group" id="propietarios-reportes">
          <h3>Propietarios</h3>
          <p>Reportes, cartera y solicitudes.</p>
          ${ZONA_LINKS.propietarios.map((n) => `<a href="${n.href}">${n.label}</a>`).join("")}
        </article>
      </div>
    `;
    main.prepend(panel);
  };

  const bindScrollShadow = () => {
    const apply = () => {
      if (window.scrollY > 8) document.body.classList.add("scrolled");
      else document.body.classList.remove("scrolled");
    };
    apply();
    window.addEventListener("scroll", apply, { passive: true });
  };

  const normalizeAssetLinks = () => {
    document.querySelectorAll('link[href*="styles.css"]').forEach((el) => {
      if (!(el instanceof HTMLLinkElement)) return;
      el.setAttribute("href", "./styles.css?v=101");
    });
    document.querySelectorAll('script[src*="data.js"]').forEach((el) => {
      if (!(el instanceof HTMLScriptElement)) return;
      el.setAttribute("src", "./data.js?v=101");
    });
    document.querySelectorAll('script[src*="app.js"]').forEach((el) => {
      if (!(el instanceof HTMLScriptElement)) return;
      el.setAttribute("src", "./app.js?v=101");
    });
  };

  const boot = () => {
    normalizeAssetLinks();
    mountHeader();
    mountMobileDrawer();
    mountZoneClientsModal();
    bindScrollShadow();
    upgradeHero();
    polishCards();
    polishClientsPage();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
