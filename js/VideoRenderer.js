import { Config } from './config.js';
import { esc, fmtDate, fmtViews } from './utils.js';

function channelBadge(channel) {
  const label = Config.CHANNEL_LABELS[channel] ?? channel;
  return `<span class="card-ch ch-${esc(channel)}">${esc(label)}</span>`;
}

function categoryTags(v) {
  const tags = v.categories.map(c =>
    `<span class="cat cat-${esc(c)}">${esc(c)}</span>`
  );
  if (v.view_count >= Config.POPULAR_THRESHOLD) {
    tags.push(`<span class="cat cat-popular">popular</span>`);
  }
  return `<div class="card-cats">${tags.join('')}</div>`;
}

export function buildCard(v) {
  const src   = v.thumbnail || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
  const date  = v.upload_date ? `<span class="card-date">${esc(fmtDate(v.upload_date))}</span>` : '';
  const views = v.view_count > 0 ? `<span class="card-views">${esc(fmtViews(v.view_count))}</span>` : '';

  return `
<article class="card" tabindex="0" data-id="${esc(v.id)}"
         role="button" aria-label="Play: ${esc(v.title)}">
  <div class="card-thumb">
    <img src="${esc(src)}" alt="${esc(v.title)}" loading="lazy"
         onerror="window.__imgFb(this,'${esc(v.id)}')">
    <span class="play-icon" aria-hidden="true">&#9654;</span>
    ${channelBadge(v.channel)}
  </div>
  <div class="card-body">
    <div class="card-meta">${date}${views}</div>
    <h3 class="card-title">${esc(v.title)}</h3>
    ${categoryTags(v)}
  </div>
</article>`;
}

export function buildFeaturedCard(v) {
  const src   = v.thumbnail || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
  const title = v.title.length > 55 ? `${v.title.slice(0, 55)}…` : v.title;

  return `
<div class="feat-card" tabindex="0" data-id="${esc(v.id)}"
     role="button" aria-label="${esc(v.title)}">
  <div class="feat-thumb">
    <img src="${esc(src)}" alt="" loading="lazy"
         onerror="window.__imgFb(this,'${esc(v.id)}')">
    <span class="play-icon" aria-hidden="true">&#9654;</span>
  </div>
  <div class="feat-body"><span class="feat-title">${esc(title)}</span></div>
</div>`;
}

export function buildPagination(total, page, pages) {
  if (pages <= 1) return '';

  const range = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
      range.push(i);
    } else if (range.at(-1) !== '…') {
      range.push('…');
    }
  }

  const prev  = `<button class="pg-btn"${page === 1 ? ' disabled' : ''} data-page="${page - 1}" aria-label="Previous page">&#8249; Prev</button>`;
  const next  = `<button class="pg-btn"${page === pages ? ' disabled' : ''} data-page="${page + 1}" aria-label="Next page">Next &#8250;</button>`;
  const btns  = range.map(p =>
    p === '…'
      ? `<span class="pg-ellipsis">…</span>`
      : `<button class="pg-btn${p === page ? ' active' : ''}" data-page="${p}" aria-current="${p === page ? 'page' : 'false'}">${p}</button>`
  ).join('');

  return `
<div class="pagination" role="navigation" aria-label="Page navigation">
  ${prev}${btns}${next}
  <p class="pg-info">Page ${page} of ${pages} &mdash; ${total} videos</p>
</div>`;
}

export function buildFilterButtons(categories, channels) {
  const BUILTIN = ['all', 'popular'];
  const dynCats = Object.keys(categories).sort();
  const allCats = [...BUILTIN, ...dynCats.filter(c => !BUILTIN.includes(c))];

  const catBtns = allCats.map((c, i) =>
    `<button class="filter-btn${i === 0 ? ' active' : ''}" data-filter="${esc(c)}" aria-pressed="${i === 0}">${esc(c)}</button>`
  ).join('');

  const allChannels = ['all', ...Object.keys(channels)];
  const chBtns = allChannels.map((ch, i) => {
    const label = ch === 'all' ? 'All channels' : (Config.CHANNEL_LABELS[ch] ?? ch);
    return `<button class="filter-btn${i === 0 ? ' active' : ''}" data-channel="${esc(ch)}" aria-pressed="${i === 0}">${esc(label)}</button>`;
  }).join('');

  return { catBtns, chBtns };
}
