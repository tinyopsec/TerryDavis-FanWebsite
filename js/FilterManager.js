import { Config } from './config.js';

const DEFAULT_STATE = {
  q:        '',
  category: 'all',
  channel:  'all',
  sort:     'default',
  page:     1,
};

export const FilterManager = (() => {
  let _state     = { ...DEFAULT_STATE };
  let _listeners = [];

  function get() {
    return { ..._state };
  }

  function set(patch) {
    const affectsResults = Object.keys(patch).some(k => k !== 'page');
    Object.assign(_state, patch);
    if (affectsResults && !('page' in patch)) _state.page = 1;
    _notify();
  }

  function reset() {
    _state = { ...DEFAULT_STATE };
    _notify();
  }

  function onChange(fn) {
    _listeners.push(fn);
  }

  function _notify() {
    const snapshot = get();
    _listeners.forEach(fn => fn(snapshot));
  }

  function apply(videos) {
    let result = [...videos];

    const q = _state.q.toLowerCase();
    if (q) {
      result = result.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
      );
    }

    const cat = _state.category;
    if (cat === 'popular') {
      result = result.filter(v => v.view_count >= Config.POPULAR_THRESHOLD);
    } else if (cat !== 'all') {
      result = result.filter(v => v.categories.includes(cat));
    }

    const ch = _state.channel;
    if (ch !== 'all') {
      result = result.filter(v => v.channel === ch);
    }

    switch (_state.sort) {
      case 'newest': result.sort((a, b) => b.upload_date.localeCompare(a.upload_date)); break;
      case 'oldest': result.sort((a, b) => a.upload_date.localeCompare(b.upload_date)); break;
      case 'views':  result.sort((a, b) => b.view_count  - a.view_count);               break;
    }

    const total = result.length;
    const pages = Math.max(1, Math.ceil(total / Config.PER_PAGE));
    const page  = Math.min(Math.max(1, _state.page), pages);
    const start = (page - 1) * Config.PER_PAGE;

    return {
      items: result.slice(start, start + Config.PER_PAGE),
      total,
      page,
      pages,
    };
  }

  return { get, set, reset, onChange, apply };
})();
