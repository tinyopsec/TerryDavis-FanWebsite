import { Config } from './config.js';
import { $, fmtDate, fmtViews } from './utils.js';
import { VideoManager } from './VideoManager.js';

const TEMPLATE = `
<div class="modal-backdrop" id="modal-bd"></div>
<div class="modal-box" id="modal-box">
  <div class="modal-hd">
    <span class="modal-hd-label">&#9654; NOW PLAYING</span>
    <button class="modal-close" id="modal-close" aria-label="Close player">&#10005; CLOSE</button>
  </div>
  <div class="modal-video-wrap">
    <iframe id="modal-iframe" class="modal-iframe"
            allow="autoplay; encrypted-media" allowfullscreen
            title="Video player"></iframe>
    <div class="modal-fallback" id="modal-fallback">
      <span>Embed unavailable</span>
      <a id="modal-yt-fallback" class="btn btn-primary"
         target="_blank" rel="noopener noreferrer">Open on YouTube &#8599;</a>
    </div>
  </div>
  <div class="modal-info">
    <h3 class="modal-title-text" id="modal-title-text"></h3>
    <div class="modal-meta-row">
      <span class="modal-meta-item"><span class="lbl">Date</span><span class="val" id="modal-date"></span></span>
      <span class="modal-meta-item"><span class="lbl">Views</span><span class="val" id="modal-views"></span></span>
      <span class="modal-meta-item"><span class="lbl">Channel</span><span class="val" id="modal-ch"></span></span>
    </div>
    <p class="modal-desc" id="modal-desc"></p>
    <div class="modal-actions">
      <a id="modal-yt" class="btn btn-primary btn-sm"
         target="_blank" rel="noopener noreferrer">Open on YouTube &#8599;</a>
      <button class="btn btn-ghost btn-sm" id="modal-close2" aria-label="Close player">&#10005; Close</button>
    </div>
  </div>
</div>`;

export const ModalPlayer = (() => {
  let _el        = null;
  let _lastFocus = null;

  function init() {
    if (_el) return;

    _el = document.createElement('div');
    _el.id        = 'video-modal';
    _el.className = 'modal';
    _el.setAttribute('role', 'dialog');
    _el.setAttribute('aria-modal', 'true');
    _el.setAttribute('aria-labelledby', 'modal-title-text');
    _el.innerHTML = TEMPLATE;
    document.body.appendChild(_el);

    $('modal-bd').addEventListener('click', close);
    $('modal-close').addEventListener('click', close);
    $('modal-close2').addEventListener('click', close);

    $('modal-iframe').addEventListener('error', () => {
      $('modal-iframe').style.display = 'none';
      $('modal-fallback').classList.add('show');
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _el?.classList.contains('visible')) close();
    });
  }

  function open(id) {
    const v = VideoManager.getById(id);
    if (!v || !_el) return;

    _lastFocus = document.activeElement;

    $('modal-title-text').textContent = v.title;
    $('modal-date').textContent        = fmtDate(v.upload_date) || '—';
    $('modal-views').textContent       = fmtViews(v.view_count) || '—';
    $('modal-ch').textContent          = Config.CHANNEL_LABELS[v.channel] ?? v.channel;
    $('modal-desc').textContent        = (v.description && v.description !== v.title) ? v.description : '';

    const ytUrl = v.url || `https://youtu.be/${v.id}`;
    $('modal-yt').href          = ytUrl;
    $('modal-yt-fallback').href = ytUrl;

    const iframe = $('modal-iframe');
    iframe.style.display = '';
    $('modal-fallback').classList.remove('show');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0&modestbranding=1`;

    _el.classList.add('visible');
    document.body.classList.add('no-scroll');
    setTimeout(() => $('modal-close')?.focus(), 50);
  }

  function close() {
    if (!_el) return;
    const iframe = $('modal-iframe');
    if (iframe) iframe.src = '';
    _el.classList.remove('visible');
    document.body.classList.remove('no-scroll');
    if (_lastFocus) { _lastFocus.focus(); _lastFocus = null; }
  }

  return { init, open, close };
})();
