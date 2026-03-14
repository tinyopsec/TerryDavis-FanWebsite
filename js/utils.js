export const $  = id          => document.getElementById(id);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

export function fmtDate(d) {
  const s = String(d);
  if (s.length !== 8) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

export function fmtViews(n) {
  const x = Number(n);
  if (!x) return '';
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M views`;
  if (x >= 1_000)     return `${Math.round(x / 1_000)}K views`;
  return `${x} views`;
}

export function imgFallback(img, id, step = 1) {
  img.onerror = null;
  if (step === 1) {
    img.onerror = () => imgFallback(img, id, 2);
    img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  } else {
    img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect width='320' height='180' fill='%230f0f0f'/%3E%3Ctext x='160' y='98' text-anchor='middle' font-family='monospace' font-size='11' fill='%23364836'%3ENO IMAGE%3C/text%3E%3C/svg%3E`;
  }
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
