import { Config } from './config.js';

const VALID_ID = /^[A-Za-z0-9_-]{11}$/;

function normalize(raw) {
  return {
    id:          String(raw.id          ?? '').trim(),
    title:       String(raw.title       ?? 'Untitled').trim() || 'Untitled',
    channel:     String(raw.channel     ?? 'unknown').trim().toLowerCase(),
    categories:  Array.isArray(raw.categories)
                   ? raw.categories.map(c => String(c).trim().toLowerCase()).filter(Boolean)
                   : [],
    description: String(raw.description ?? '').trim(),
    upload_date: String(raw.upload_date ?? '').trim(),
    view_count:  Math.max(0, Number(raw.view_count) || 0),
    duration:    String(raw.duration    ?? '').trim(),
    thumbnail:   String(raw.thumbnail   ?? '').trim(),
    url:         String(raw.url         ?? '').trim(),
  };
}

function validate(v) {
  return VALID_ID.test(v.id) && v.title.length > 0;
}

function readCache() {
  try {
    const raw = localStorage.getItem(Config.CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > Config.CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(Config.CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

function clearCache() {
  try {
    localStorage.removeItem(Config.CACHE_KEY);
  } catch {}
}

export const VideoManager = (() => {
  let _videos = [];

  async function load(bust = false) {
    if (!bust) {
      const cached = readCache();
      if (cached) {
        _videos = cached;
        return _videos;
      }
    } else {
      clearCache();
    }

    const url = bust ? `${Config.DATA_URL}?t=${Date.now()}` : Config.DATA_URL;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const raw = await res.json();
    _videos = raw.map(normalize).filter(validate);
    writeCache(_videos);
    return _videos;
  }

  function all() {
    return _videos;
  }

  function getById(id) {
    return _videos.find(v => v.id === id) ?? null;
  }

  function channels() {
    const out = {};
    _videos.forEach(v => { out[v.channel] = (out[v.channel] ?? 0) + 1; });
    return out;
  }

  function categories() {
    const out = {};
    _videos.forEach(v => {
      v.categories.forEach(c => { out[c] = (out[c] ?? 0) + 1; });
    });
    return out;
  }

  function stats() {
    return {
      total:      _videos.length,
      channels:   channels(),
      categories: categories(),
      popular:    _videos.filter(v => v.view_count >= Config.POPULAR_THRESHOLD).length,
    };
  }

  return { load, all, getById, channels, categories, stats };
})();
