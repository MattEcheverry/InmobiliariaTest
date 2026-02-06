const FAVORITES_KEY = 'gv_favorites';

const formatCOP = value => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const getFavorites = () => JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
const setFavorites = ids => localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
const isFav = id => getFavorites().includes(id);

function toggleFavorite(id) {
  const current = getFavorites();
  const updated = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
  setFavorites(updated);
  renderHomeFeatured();
  renderSearchResults();
}

function createPropertyCard(property, showActions = false) {
  const article = document.createElement('article');
  article.className = 'property-card';
  const favActive = isFav(property.id) ? 'active' : '';

  article.innerHTML = `
    <div class="property-media">
      <img src="${property.imagen}" alt="${property.titulo}" loading="lazy">
      <button class="fav-btn ${favActive}" aria-label="Guardar inmueble favorito" data-fav-id="${property.id}">❤</button>
    </div>
    <div class="property-body">
      <p class="property-price">${formatCOP(property.precio)}</p>
      <p class="property-location">${property.ciudad} · ${property.zona}</p>
      <strong>${property.titulo}</strong>
      <p class="property-specs">${property.habitaciones || '-'} hab · ${property.banos || '-'} baños · ${property.area} m² · Código ${property.codigo}</p>
      ${showActions ? `<div class="property-actions">
        <a class="btn btn-primary" target="_blank" rel="noopener" href="${buildWhatsAppLink(property)}">WhatsApp / Agendar visita</a>
      </div>` : ''}
    </div>
  `;
  return article;
}

function buildWhatsAppLink(property) {
  const msg = encodeURIComponent(`Hola Grupo Versa, me interesa este inmueble:\nCódigo: ${property.codigo}\nGestión: ${property.gestion}\nUbicación: ${property.ciudad} - ${property.zona}\nPrecio: ${formatCOP(property.precio)}\nLink: https://grupoversa.com.co/inmueble/${property.codigo}`);
  return `https://wa.me/57XXXXXXXXXX?text=${msg}`;
}

function attachFavoriteEvents(scope = document) {
  scope.querySelectorAll('[data-fav-id]').forEach(btn => {
    btn.onclick = () => toggleFavorite(Number(btn.dataset.favId));
  });
}

function renderHomeFeatured() {
  const container = document.getElementById('featured-list');
  if (!container) return;
  const featured = PROPERTIES.filter(p => p.gestion === 'arriendo').slice(0, 8);
  container.innerHTML = '';
  featured.forEach(property => container.appendChild(createPropertyCard(property)));
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
  return properties.filter(p => {
    const byGestion = !filters.gestion || p.gestion === filters.gestion;
    const byTipo = !filters.tipo || p.tipo === filters.tipo;
    const byCiudad = !filters.ciudad || `${p.ciudad} ${p.zona}`.toLowerCase().includes(filters.ciudad.toLowerCase());
    const byPrecio = p.precio >= filters.precioMin && p.precio <= filters.precioMax;
    const byHab = !filters.habitaciones || p.habitaciones >= filters.habitaciones;
    const byBanos = !filters.banos || p.banos >= filters.banos;
    const byArea = p.area >= filters.areaMin && p.area <= filters.areaMax;
    return byGestion && byTipo && byCiudad && byPrecio && byHab && byBanos && byArea;
  });
}

function renderSearchResults() {
  const container = document.getElementById('search-results');
  if (!container) return;
  const filters = getSearchFilters();
  const results = applyFilters(PROPERTIES, filters);
  const count = document.getElementById('results-count');
  if (count) count.textContent = `${results.length} resultado(s)`;

  container.innerHTML = '';
  if (!results.length) {
    container.innerHTML = '<div class="panel"><p>No encontramos inmuebles con esos filtros. Ajusta criterios y vuelve a intentar.</p></div>';
    return;
  }

  results.forEach(property => container.appendChild(createPropertyCard(property, true)));
  attachFavoriteEvents(container);
}

function syncGestionTabs() {
  const tabs = document.querySelectorAll('[data-gestion-tab]');
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const gestion = tab.dataset.gestionTab;
      const input = document.getElementById('gestion');
      if (input) input.value = gestion;
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
  const form = document.getElementById('search-form');
  if (!form) return;
  const params = new URLSearchParams(window.location.search);
  ['gestion', 'tipo', 'ciudad', 'precioMin', 'precioMax'].forEach(key => {
    const el = document.getElementById(key);
    if (el && params.get(key)) el.value = params.get(key);
  });
}

function setupSearchInteractions() {
  const form = document.getElementById('search-form');
  if (form) {
    form.addEventListener('input', renderSearchResults);
    form.addEventListener('submit', e => {
      e.preventDefault();
      renderSearchResults();
    });
  }

  const listBtn = document.getElementById('view-list');
  const mapBtn = document.getElementById('view-map');
  const searchMain = document.querySelector('.search-main');
  if (listBtn && mapBtn && searchMain) {
    listBtn.onclick = () => {
      listBtn.classList.add('active');
      mapBtn.classList.remove('active');
      searchMain.classList.add('hide-map');
      searchMain.classList.remove('show-map');
    };
    mapBtn.onclick = () => {
      mapBtn.classList.add('active');
      listBtn.classList.remove('active');
      searchMain.classList.add('show-map');
      searchMain.classList.remove('hide-map');
    };
  }
}

function setupClientTabs() {
  const tabButtons = document.querySelectorAll('[data-client-tab]');
  if (!tabButtons.length) return;
  const blocks = document.querySelectorAll('.client-block');
  const activate = target => {
    tabButtons.forEach(b => b.classList.toggle('active', b.dataset.clientTab === target));
    blocks.forEach(block => block.classList.toggle('active', block.id === `${target}-block`));
  };
  tabButtons.forEach(button => button.onclick = () => activate(button.dataset.clientTab));
}

document.addEventListener('DOMContentLoaded', () => {
  syncGestionTabs();
  setupForms();
  hydrateSearchFromQuery();
  setupSearchInteractions();
  setupClientTabs();
  renderHomeFeatured();
  renderSearchResults();
});
