const TAD = (() => {
  const PER_PAGE = 48;
  const POPULAR  = 50000;
  const LS_KEY   = 'tad_v3';
  const LS_TS    = 'tad_v3_ts';
  const LS_TTL   = 86400000;

  const state = {
    all:      [],
    filtered: [],
    page:     1,
    q:        '',
    cat:      'all',
    channel:  'all',
    sort:     'default'
  };

  const $ = id => document.getElementById(id);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]
    );
  }

  function fmtDate(d) {
    const s = String(d);
    if (s.length !== 8) return s;
    return s.slice(0,4) + '-' + s.slice(4,6) + '-' + s.slice(6,8);
  }

  function fmtViews(n) {
    const x = Number(n);
    if (!x) return '';
    if (x >= 1e6) return (x / 1e6).toFixed(1) + 'M views';
    if (x >= 1e3) return Math.round(x / 1e3) + 'K views';
    return x + ' views';
  }

  function imgFallback(img, id, step) {
    const s = step || 1;
    img.onerror = null;
    if (s === 1) {
      img.onerror = () => imgFallback(img, id, 2);
      img.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
    } else {
      img.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%230f0f0f\'/%3E%3Ctext x=\'160\' y=\'98\' text-anchor=\'middle\' font-family=\'monospace\' font-size=\'11\' fill=\'%23364836\'%3ENO IMAGE%3C/text%3E%3C/svg%3E';
    }
  }

  let modalEl = null;

  function createModal() {
    if (modalEl) return;
    modalEl = document.createElement('div');
    modalEl.id = 'video-modal';
    modalEl.className = 'modal';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'modal-title-text');
    modalEl.innerHTML =
      '<div class="modal-backdrop" id="modal-bd"></div>' +
      '<div class="modal-box" id="modal-box">' +
        '<div class="modal-hd">' +
          '<span class="modal-hd-label">&#9654; NOW PLAYING</span>' +
          '<button class="modal-close" id="modal-close" aria-label="Close player">&#10005; CLOSE</button>' +
        '</div>' +
        '<div class="modal-video-wrap">' +
          '<iframe id="modal-iframe" class="modal-iframe" allow="autoplay; encrypted-media" allowfullscreen title="Video player"></iframe>' +
          '<div class="modal-fallback" id="modal-fallback">' +
            '<span>Embed unavailable</span>' +
            '<a id="modal-yt-fallback" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Open on YouTube &#8599;</a>' +
          '</div>' +
        '</div>' +
        '<div class="modal-info">' +
          '<h3 class="modal-title-text" id="modal-title-text"></h3>' +
          '<div class="modal-meta-row">' +
            '<span class="modal-meta-item"><span class="lbl">Date</span><span class="val" id="modal-date"></span></span>' +
            '<span class="modal-meta-item"><span class="lbl">Views</span><span class="val" id="modal-views"></span></span>' +
            '<span class="modal-meta-item"><span class="lbl">Channel</span><span class="val" id="modal-ch"></span></span>' +
          '</div>' +
          '<p class="modal-desc" id="modal-desc"></p>' +
          '<div class="modal-actions">' +
            '<a id="modal-yt" class="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer">Open on YouTube &#8599;</a>' +
            '<button class="btn btn-ghost btn-sm" id="modal-close2" aria-label="Close player">&#10005; Close</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modalEl);

    $('modal-bd').addEventListener('click', closeModal);
    $('modal-close').addEventListener('click', closeModal);
    $('modal-close2').addEventListener('click', closeModal);

    $('modal-iframe').addEventListener('error', () => {
      $('modal-iframe').style.display = 'none';
      $('modal-fallback').classList.add('show');
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modalEl && modalEl.classList.contains('visible')) {
        closeModal();
      }
    });
  }

  let lastFocus = null;

  function openModal(id) {
    const v = state.all.find(x => x.id === id);
    if (!v || !modalEl) return;

    lastFocus = document.activeElement;

    $('modal-title-text').textContent = v.title;
    $('modal-date').textContent        = fmtDate(v.upload_date) || '—';
    $('modal-views').textContent       = fmtViews(v.view_count) || '—';
    $('modal-ch').textContent          = v.channel === 'terry' ? 'Terry A. Davis' : 'Davisanism';
    $('modal-desc').textContent        = (v.description && v.description !== v.title) ? v.description : '';

    const ytLink = v.url || ('https://youtu.be/' + v.id);
    $('modal-yt').href = ytLink;
    $('modal-yt-fallback').href = ytLink;

    const iframe = $('modal-iframe');
    iframe.style.display = '';
    $('modal-fallback').classList.remove('show');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.id) + '?autoplay=1&rel=0&modestbranding=1';

    modalEl.classList.add('visible');
    document.body.classList.add('no-scroll');

    setTimeout(() => {
      const closeBtn = $('modal-close');
      if (closeBtn) closeBtn.focus();
    }, 50);
  }

  function closeModal() {
    if (!modalEl) return;
    const iframe = $('modal-iframe');
    if (iframe) iframe.src = '';
    modalEl.classList.remove('visible');
    document.body.classList.remove('no-scroll');
    if (lastFocus) {
      lastFocus.focus();
      lastFocus = null;
    }
  }

  function buildCard(v) {
    const cats = (v.categories || []).map(c => '<span class="cat cat-' + esc(c) + '">' + esc(c) + '</span>').join('');
    const popular = v.view_count >= POPULAR ? '<span class="cat cat-popular">popular</span>' : '';
    const ch = v.channel === 'terry'
      ? '<span class="card-ch ch-t">T.Davis</span>'
      : '<span class="card-ch ch-d">Davisanism</span>';
    const date = v.upload_date ? fmtDate(v.upload_date) : '';
    const views = v.view_count > 0 ? '<span class="card-views">' + esc(fmtViews(v.view_count)) + '</span>' : '';

    return '<article class="card" tabindex="0" data-id="' + esc(v.id) +
      '" role="button" aria-label="Play: ' + esc(v.title) + '">' +
      '<div class="card-thumb">' +
        '<img src="' + esc(v.thumbnail || ('https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg')) + '" alt="' + esc(v.title) + '" loading="lazy" onerror="TAD.imgFb(this,\'' + esc(v.id) + '\')">' +
        '<span class="play-icon" aria-hidden="true">&#9654;</span>' +
        ch +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-meta">' +
          (date ? '<span class="card-date">' + esc(date) + '</span>' : '') +
          views +
        '</div>' +
        '<h3 class="card-title">' + esc(v.title) + '</h3>' +
        '<div class="card-cats">' + cats + popular + '</div>' +
      '</div>' +
      '</article>';
  }

  function buildPagination(total, cur, size) {
    const pages = Math.ceil(total / size);
    if (pages <= 1) return '';

    const range = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= cur - 2 && i <= cur + 2)) {
        range.push(i);
      } else if (range[range.length - 1] !== '…') {
        range.push('…');
      }
    }

    let html = '<div class="pagination" role="navigation" aria-label="Page navigation">';

    html += '<button class="pg-btn"' + (cur === 1 ? ' disabled' : '') +
      ' data-page="' + (cur - 1) + '" aria-label="Previous page">&#8249; Prev</button>';

    range.forEach(p => {
      if (p === '…') {
        html += '<span class="pg-ellipsis">…</span>';
      } else {
        html += '<button class="pg-btn' + (p === cur ? ' active' : '') +
          '" data-page="' + p + '" aria-current="' + (p === cur ? 'page' : 'false') + '">' + p + '</button>';
      }
    });

    html += '<button class="pg-btn"' + (cur === pages ? ' disabled' : '') +
      ' data-page="' + (cur + 1) + '" aria-label="Next page">Next &#8250;</button>';

    html += '<p class="pg-info">Page ' + cur + ' of ' + pages + ' &mdash; ' + total + ' videos</p>';
    html += '</div>';

    return html;
  }

  function attachCards(container) {
    $$(  '.card', container).forEach(card => {
      card.addEventListener('click', () => openModal(card.dataset.id));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(card.dataset.id);
        }
      });
    });
  }

  function renderGrid() {
    const grid   = $('video-grid');
    const pgWrap = $('pagination-wrap');
    const cntEl  = $('results-count');
    if (!grid) return;

    const start = (state.page - 1) * PER_PAGE;
    const slice = state.filtered.slice(start, start + PER_PAGE);

    if (cntEl) {
      cntEl.innerHTML = '<strong>' + state.filtered.length.toLocaleString() + '</strong> videos';
    }

    if (slice.length === 0) {
      grid.innerHTML = '<div class="empty">No videos found. Try a different filter or search term.</div>';
      if (pgWrap) pgWrap.innerHTML = '';
      return;
    }

    grid.innerHTML = slice.map(buildCard).join('');
    attachCards(grid);

    if (pgWrap) {
      pgWrap.innerHTML = buildPagination(state.filtered.length, state.page, PER_PAGE);
      $$('.pg-btn', pgWrap).forEach(btn => {
        btn.addEventListener('click', () => {
          state.page = parseInt(btn.dataset.page, 10);
          renderGrid();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    }
  }

  function applyAndRender() {
    const q = state.q.toLowerCase();

    state.filtered = state.all.filter(v => {
      if (state.channel !== 'all' && v.channel !== state.channel) return false;

      if (state.cat === 'popular') {
        if (v.view_count < POPULAR) return false;
      } else if (state.cat !== 'all') {
        if (!(v.categories || []).includes(state.cat)) return false;
      }

      if (q) {
        const hay = (v.title + ' ' + (v.description || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    switch (state.sort) {
      case 'newest':
        state.filtered.sort((a, b) => String(b.upload_date).localeCompare(String(a.upload_date)));
        break;
      case 'oldest':
        state.filtered.sort((a, b) => String(a.upload_date).localeCompare(String(b.upload_date)));
        break;
      case 'views':
        state.filtered.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        break;
    }

    state.page = 1;
    renderGrid();
  }

  function exportCSV() {
    const cols = ['id', 'title', 'upload_date', 'url', 'view_count', 'categories', 'channel', 'duration'];
    const rows = [cols.join(',')];

    state.filtered.forEach(v => {
      rows.push([
        v.id,
        '"' + String(v.title || '').replace(/"/g, '""') + '"',
        v.upload_date || '',
        v.url || '',
        v.view_count || 0,
        '"' + (v.categories || []).join(';') + '"',
        v.channel || '',
        v.duration || ''
      ].join(','));
    });

    const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'terry_davis_archive.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function loadVideos() {
    const cached = localStorage.getItem(LS_KEY);
    const ts     = parseInt(localStorage.getItem(LS_TS) || '0', 10);

    if (cached && Date.now() - ts < LS_TTL) {
      try {
        state.all = JSON.parse(cached);
        return;
      } catch (_) {
        localStorage.removeItem(LS_KEY);
      }
    }

    const res = await fetch('videos.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    state.all = await res.json();

    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state.all));
      localStorage.setItem(LS_TS, String(Date.now()));
    } catch (_) {}
  }

  async function refreshCache() {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_TS);
    const btn = $('refresh-btn');
    if (btn) { btn.textContent = 'REFRESHING…'; btn.disabled = true; }
    try {
      await loadVideos();
      applyAndRender();
      const tc = $('total-count');
      if (tc) tc.textContent = state.all.length.toLocaleString();
    } catch (e) {
      const g = $('video-grid');
      if (g) g.innerHTML = '<div class="empty">Reload failed: ' + esc(e.message) + '</div>';
    } finally {
      if (btn) { btn.textContent = 'REFRESH'; btn.disabled = false; }
    }
  }

  async function initVideosPage() {
    createModal();
    const grid = $('video-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading-state">Loading ' + String.fromCharCode(8230) + '</div>';

    try {
      await loadVideos();
    } catch (e) {
      grid.innerHTML = '<div class="empty">Cannot load videos.json &mdash; serve via HTTP (not file://). Error: ' + esc(e.message) + '</div>';
      return;
    }

    const tc = $('total-count');
    if (tc) tc.textContent = state.all.length.toLocaleString();

    applyAndRender();

    const searchEl = $('search-input');
    if (searchEl) {
      let timer;
      searchEl.addEventListener('input', e => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          state.q = e.target.value.trim();
          applyAndRender();
        }, 220);
      });
    }

    $$('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('[data-filter]').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        state.cat = btn.dataset.filter;
        applyAndRender();
      });
    });

    $$('[data-channel]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('[data-channel]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.channel = btn.dataset.channel;
        applyAndRender();
      });
    });

    const sortEl = $('sort-select');
    if (sortEl) {
      sortEl.addEventListener('change', e => {
        state.sort = e.target.value;
        applyAndRender();
      });
    }

    const csvBtn = $('csv-btn');
    if (csvBtn) csvBtn.addEventListener('click', exportCSV);

    const refBtn = $('refresh-btn');
    if (refBtn) refBtn.addEventListener('click', refreshCache);
  }

  async function initIndexPage() {
    createModal();

    try {
      await loadVideos();
    } catch (_) { return; }

    const tc = $('stat-total');
    if (tc) tc.textContent = state.all.length.toLocaleString();

    const fg = $('featured-grid');
    if (fg) {
      const picks = state.all.slice(0, 6);
      fg.innerHTML = picks.map(v => {
        const short = v.title.length > 55 ? v.title.slice(0, 55) + '…' : v.title;
        const thumb = v.thumbnail || ('https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg');
        return '<div class="feat-card" tabindex="0" data-id="' + esc(v.id) + '" role="button" aria-label="' + esc(v.title) + '">' +
          '<div class="feat-thumb"><img src="' + esc(thumb) + '" alt="" loading="lazy" onerror="TAD.imgFb(this,\'' + esc(v.id) + '\')"></div>' +
          '<div class="feat-body"><span class="feat-title">' + esc(short) + '</span></div>' +
          '</div>';
      }).join('');

      $$('.feat-card', fg).forEach(card => {
        card.addEventListener('click', () => openModal(card.dataset.id));
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(card.dataset.id); }
        });
      });
    }
  }

  async function initWikiPage() {
    const wrap = $('wiki-wrap');
    if (!wrap) return;

    wrap.innerHTML = '<div class="wiki-loading">Fetching Wikipedia article' + String.fromCharCode(8230) + '</div>';

    try {
      const apiUrl = 'https://en.wikipedia.org/w/api.php?action=parse&page=Terry_A._Davis&prop=text&format=json&origin=*&disableeditsection=true&disabletoc=false';
      const res  = await fetch(apiUrl);
      if (!res.ok) throw new Error('API error ' + res.status);
      const data = await res.json();
      const html = data.parse && data.parse.text && data.parse.text['*'];
      if (!html) throw new Error('No content');

      const parser = new DOMParser();
      const doc    = parser.parseFromString(html, 'text/html');

      const removeSelectors = [
        '.navbox', '.navbox-inner', '.vertical-navbox', '.navbox-styles',
        '.mw-editsection', '#catlinks', '.noprint', '.mbox-small',
        '.ambox', '.tmbox', '.ombox', '.fmbox', '.cmbox',
        '.sister-project', '.metadata', '.navigation-not-searchable',
        '.mw-empty-elt', 'style', '.hatnote'
      ];
      removeSelectors.forEach(sel => {
        doc.querySelectorAll(sel).forEach(el => el.remove());
      });

      doc.querySelectorAll('img').forEach(img => {
        let src = img.getAttribute('src') || '';
        if (src.startsWith('//')) src = 'https:' + src;
        else if (src.startsWith('/')) src = 'https://en.wikipedia.org' + src;
        img.src = src;
        img.loading = 'lazy';

        let ss = img.getAttribute('srcset') || '';
        if (ss) {
          ss = ss.replace(/\/\//g, 'https://');
          img.srcset = ss;
        }
      });

      doc.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href') || '';
        if (href.startsWith('/wiki/')) {
          a.href   = 'https://en.wikipedia.org' + href;
          a.target = '_blank';
          a.rel    = 'noopener noreferrer';
        } else if (href.startsWith('//')) {
          a.href   = 'https:' + href;
          a.target = '_blank';
          a.rel    = 'noopener noreferrer';
        } else if (href.startsWith('/')) {
          a.href = 'https://en.wikipedia.org' + href;
        }
      });

      const content = doc.querySelector('.mw-parser-output');
      const inner   = content ? content : doc.body;

      wrap.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'wiki-content';
      div.innerHTML = inner.innerHTML;
      wrap.appendChild(div);

    } catch (err) {
      wrap.innerHTML =
        '<div class="wiki-error">' +
        '<p>Could not load the Wikipedia article.</p>' +
        '<p style="margin-top:.75rem">' +
        '<a href="https://en.wikipedia.org/wiki/Terry_A._Davis" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Read on Wikipedia &#8599;</a>' +
        '</p>' +
        '<p style="margin-top:.75rem;font-size:.72rem;color:var(--text3)">Error: ' + esc(err.message) + '</p>' +
        '</div>';
    }
  }

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

  function init() {
    initNav();
    const page = document.body.dataset.page;
    if (page === 'videos')    initVideosPage();
    else if (page === 'index') initIndexPage();
    else if (page === 'wiki')  initWikiPage();
  }

  return {
    init,
    imgFb: (img, id) => imgFallback(img, id, 1)
  };
})();

document.addEventListener('DOMContentLoaded', TAD.init);
