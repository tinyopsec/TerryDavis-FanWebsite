import { $ } from './utils.js';

const API_URL =
  'https://en.wikipedia.org/w/api.php?action=parse&page=Terry_A._Davis' +
  '&prop=text&format=json&origin=*&disableeditsection=true';

const STRIP_SELECTORS = [
  '.navbox', '.navbox-inner', '.vertical-navbox', '.navbox-styles',
  '.mw-editsection', '#catlinks', '.noprint', '.mbox-small',
  '.ambox', '.tmbox', '.ombox', '.fmbox', '.cmbox',
  '.sister-project', '.metadata', '.navigation-not-searchable',
  '.mw-empty-elt', 'style', '.hatnote',
];

function fixImages(doc) {
  doc.querySelectorAll('img').forEach(img => {
    let src = img.getAttribute('src') || '';
    if (src.startsWith('//'))  src = 'https:' + src;
    if (src.startsWith('/') && !src.startsWith('//')) src = 'https://en.wikipedia.org' + src;
    img.src     = src;
    img.loading = 'lazy';

    const ss = img.getAttribute('srcset') || '';
    if (ss) img.srcset = ss.replace(/\/\//g, 'https://');
  });
}

function fixLinks(doc) {
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
}

export async function loadWiki() {
  const wrap = $('wiki-wrap');
  if (!wrap) return;

  wrap.innerHTML = '<div class="wiki-loading">Fetching article…</div>';

  try {
    const res  = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const html = data?.parse?.text?.['*'];
    if (!html) throw new Error('Empty response');

    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, 'text/html');

    STRIP_SELECTORS.forEach(sel =>
      doc.querySelectorAll(sel).forEach(el => el.remove())
    );
    fixImages(doc);
    fixLinks(doc);

    const content = doc.querySelector('.mw-parser-output') ?? doc.body;
    const div     = document.createElement('div');
    div.className = 'wiki-content';
    div.innerHTML = content.innerHTML;

    wrap.innerHTML = '';
    wrap.appendChild(div);

  } catch (err) {
    wrap.innerHTML = `
      <div class="wiki-error">
        <p>Could not load the Wikipedia article.</p>
        <p style="margin-top:.75rem">
          <a href="https://en.wikipedia.org/wiki/Terry_A._Davis"
             target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            Read on Wikipedia &#8599;
          </a>
        </p>
        <p style="margin-top:.75rem;font-size:.72rem;color:var(--text3)">
          Error: ${err.message}
        </p>
      </div>`;
  }
}
