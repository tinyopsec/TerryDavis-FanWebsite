import { Config } from './config.js';
import { $, $$, debounce, imgFallback } from './utils.js';
import { VideoManager } from './VideoManager.js';
import { FilterManager } from './FilterManager.js';
import { buildCard, buildFeaturedCard, buildPagination, buildFilterButtons } from './VideoRenderer.js';
import { ModalPlayer } from './ModalPlayer.js';
import { loadWiki } from './WikiLoader.js';

window.__imgFb = (img, id) => imgFallback(img, id, 1);

function initNav() {
  const toggle = $('nav-toggle');
  const links  = $('nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

function attachPlayEvents(container, openFn) {
  $$('[data-id]', container).forEach(el => {
    el.addEventListener('click', () => openFn(el.dataset.id));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFn(el.dataset.id); }
    });
  });
}

function renderGrid(grid, paginationWrap) {
  const { items, total, page, pages } = FilterManager.apply(VideoManager.all());

  const rc = $('results-count');
  if (rc) rc.innerHTML = `<strong>${total.toLocaleString()}</strong> video${total !== 1 ? 's' : ''}`;

  if (!items.length) {
    grid.innerHTML = '<div class="empty">No videos match your filters.</div>';
    if (paginationWrap) paginationWrap.innerHTML = '';
    return;
  }

  grid.innerHTML = items.map(buildCard).join('');
  attachPlayEvents(grid, ModalPlayer.open);

  if (paginationWrap) {
    paginationWrap.innerHTML = buildPagination(total, page, pages);
    $$('.pg-btn:not([disabled])', paginationWrap).forEach(btn => {
      btn.addEventListener('click', () => {
        FilterManager.set({ page: Number(btn.dataset.page) });
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
}

function populateFilterControls() {
  const stats = VideoManager.stats();
  const { catBtns, chBtns } = buildFilterButtons(stats.categories, stats.channels);

  const catWrap = $('filter-cats');
  const chWrap  = $('filter-channels');
  if (catWrap) catWrap.innerHTML = catBtns;
  if (chWrap)  chWrap.innerHTML  = chBtns;
}

function bindDynamicFilters() {
  $$('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('[data-filter]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      FilterManager.set({ category: btn.dataset.filter });
    });
  });

  $$('[data-channel]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('[data-channel]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      FilterManager.set({ channel: btn.dataset.channel });
    });
  });
}

function bindStaticControls() {
  const searchEl = $('search-input');
  if (searchEl) {
    searchEl.addEventListener('input', debounce(e => {
      FilterManager.set({ q: e.target.value.trim() });
    }, Config.SEARCH_DEBOUNCE));
  }

  const sortEl = $('sort-select');
  if (sortEl) {
    sortEl.addEventListener('change', e => FilterManager.set({ sort: e.target.value }));
  }
}

function exportCSV() {
  const { items } = FilterManager.apply(VideoManager.all());
  const cols  = ['id', 'title', 'channel', 'upload_date', 'view_count', 'categories', 'duration', 'url'];
  const quote = s => `"${String(s).replace(/"/g, '""')}"`;
  const rows  = [
    cols.join(','),
    ...items.map(v => [
      quote(v.id), quote(v.title), quote(v.channel),
      quote(v.upload_date), v.view_count,
      quote(v.categories.join('|')), quote(v.duration), quote(v.url),
    ].join(',')),
  ];

  const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'terry_davis_archive.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function initVideosPage() {
  const grid    = $('video-grid');
  const pgWrap  = $('pagination-wrap');
  if (!grid) return;

  ModalPlayer.init();
  grid.innerHTML = '<div class="loading-state">Loading…</div>';

  try {
    await VideoManager.load();
  } catch (e) {
    grid.innerHTML = `<div class="empty">Cannot load videos.json — serve via HTTP. (${e.message})</div>`;
    return;
  }

  const tc = $('total-count');
  if (tc) tc.textContent = VideoManager.all().length.toLocaleString();

  populateFilterControls();
  bindStaticControls();
  bindDynamicFilters();

  FilterManager.onChange(() => renderGrid(grid, pgWrap));
  renderGrid(grid, pgWrap);

  const csvBtn = $('csv-btn');
  if (csvBtn) csvBtn.addEventListener('click', exportCSV);

  const refBtn = $('refresh-btn');
  if (refBtn) {
    refBtn.addEventListener('click', async () => {
      refBtn.textContent = 'LOADING…';
      refBtn.disabled    = true;
      try {
        await VideoManager.load(true);
        populateFilterControls();
        bindDynamicFilters();
        FilterManager.reset();
        if (tc) tc.textContent = VideoManager.all().length.toLocaleString();
      } catch (e) {
        grid.innerHTML = `<div class="empty">Reload failed: ${e.message}</div>`;
      } finally {
        refBtn.textContent = 'REFRESH';
        refBtn.disabled    = false;
      }
    });
  }
}

async function initIndexPage() {
  try {
    await VideoManager.load();
  } catch {
    return;
  }

  const tc = $('stat-total');
  if (tc) tc.textContent = VideoManager.all().length.toLocaleString();

  const fg = $('featured-grid');
  if (fg) {
    const picks = VideoManager.all().slice(0, Config.FEATURED_COUNT);
    fg.innerHTML = picks.map(buildFeaturedCard).join('');
    $$('[data-id]', fg).forEach(el => {
      el.addEventListener('click', () => { window.location.href = 'videos.html'; });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.href = 'videos.html'; }
      });
    });
  }
}

export function init() {
  initNav();
  const page = document.body.dataset.page;
  if (page === 'videos')     initVideosPage();
  else if (page === 'index') initIndexPage();
  else if (page === 'wiki')  loadWiki();
}
