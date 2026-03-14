# Front-End Architecture — Terry A. Davis Tribute Site

---

## 1. Overview

The site is a **fully static, zero-dependency** project.
No build step. No framework. No bundler.
All JavaScript is delivered as native **ES Modules** via `<script type="module">`.

Each module has one job, a minimal public API, and no hidden coupling.
Changing any module cannot break another unless the public API contract is violated.

---

## 2. Project Structure

```
/
├── index.html          ← Home / hero page          (data-page="index")
├── videos.html         ← Video archive             (data-page="videos")
├── wikipedia.html      ← Wikipedia article         (data-page="wiki")
├── style.css           ← Single global stylesheet
├── videos.json         ← Video data — edit here to add videos
├── images/
│   └── terry.jpg
└── js/
    ├── main.js          ← Entry point — DOMContentLoaded → init()
    ├── config.js        ← All magic numbers and labels in one place
    ├── utils.js         ← Pure helpers: esc, fmtDate, fmtViews, debounce, $, $$
    ├── VideoManager.js  ← Load · validate · normalise · cache · query
    ├── FilterManager.js ← Filter state · apply filters · notify listeners
    ├── VideoRenderer.js ← Pure HTML builders: card, featured card, pagination, filter buttons
    ├── ModalPlayer.js   ← Modal lifecycle: init · open(id) · close
    ├── WikiLoader.js    ← Fetch Wikipedia API · sanitise · render
    └── AppController.js ← Page detection · wire modules · bind events
```

---

## 3. Module Responsibilities & Public APIs

### `config.js`
Single source of truth for all constants.
```js
Config.PER_PAGE           // 48
Config.POPULAR_THRESHOLD  // 50 000 — threshold for "popular" badge
Config.CACHE_KEY          // localStorage key
Config.CACHE_TTL          // 24 h in ms
Config.DATA_URL           // 'videos.json'
Config.FEATURED_COUNT     // 6
Config.SEARCH_DEBOUNCE    // 220 ms
Config.CHANNEL_LABELS     // { davisanism: 'Davisanism', terry: 'Terry A. Davis' }
```
**Rule:** every magic number lives here and nowhere else.

---

### `utils.js`
Pure functions with no side effects. Safe to import anywhere.
```js
esc(s)               → HTML-escaped string
fmtDate('20170315')  → '2017-03-15'
fmtViews(125000)     → '125K views'
imgFallback(img, id) → waterfall: mqdefault → hqdefault → SVG placeholder
debounce(fn, ms)     → debounced wrapper
$(id)                → document.getElementById shorthand
$$(sel, ctx)         → querySelectorAll → Array
```

---

### `VideoManager.js`
Owns the canonical video array. Responsible for fetching, validating,
normalising, and caching. All other modules read video data through it.

```js
await VideoManager.load(bust?)   // fetch + cache; bust=true forces re-fetch
VideoManager.all()               // Video[]
VideoManager.getById(id)         // Video | null
VideoManager.channels()          // { davisanism: 800, terry: 332 }
VideoManager.categories()        // { philosophical: 450, programming: 210, … }
VideoManager.stats()             // { total, channels, categories, popular }
```

**Validation rules:** `id` must match `/^[A-Za-z0-9_-]{11}$/`, `title` must be non-empty.
Any entry that fails validation is silently dropped — the site never breaks.

**Normalisation defaults:**
| Field | Missing value |
|---|---|
| title | `'Untitled'` |
| channel | `'unknown'` |
| categories | `[]` |
| description | `''` |
| view_count | `0` |
| thumbnail | auto-built from id |

---

### `FilterManager.js`
Owns the filter state. Other modules call `set()` to change state.
Registered listeners are called synchronously on every state change.

```js
FilterManager.get()              // { q, category, channel, sort, page }
FilterManager.set({ … })         // partial patch; resets page unless page is explicit
FilterManager.reset()            // back to defaults
FilterManager.onChange(fn)       // register a listener
FilterManager.apply(videos)      // → { items[], total, page, pages }
```

`apply()` is a **pure function**: it reads state internally but does not mutate it.
The result can be used for rendering or CSV export without side effects.

---

### `VideoRenderer.js`
Pure HTML string factories. No DOM access. No state. Easily testable.

```js
buildCard(video)                            // → HTML string
buildFeaturedCard(video)                    // → HTML string
buildPagination(total, page, pages)         // → HTML string
buildFilterButtons(categories, channels)    // → { catBtns, chBtns }
```

Filter buttons are generated from the **live data** passed in —
they automatically reflect whatever categories and channels exist in `videos.json`.

---

### `ModalPlayer.js`
Self-contained modal. Reads video data through `VideoManager.getById()`.

```js
ModalPlayer.init()     // inject DOM once; safe to call multiple times (idempotent)
ModalPlayer.open(id)   // look up video, populate fields, show modal
ModalPlayer.close()    // stop iframe, hide modal, restore focus
```

Keyboard: `Escape` closes. Focus returns to the card that was activated.

---

### `WikiLoader.js`
Single exported function. Fetches the Wikipedia API, sanitises the HTML,
rewrites relative URLs to absolute, and injects into `#wiki-wrap`.

```js
await loadWiki()
```

---

### `AppController.js`
The only module that touches the DOM directly and wires everything together.
Reads `document.body.dataset.page` to decide which init function to run.

```
'index'  → initIndexPage()
'videos' → initVideosPage()
'wiki'   → initWikiPage() via loadWiki()
```

Internal functions (not exported):
```
initNav()                 — mobile hamburger
populateFilterControls()  — calls VideoManager.stats() → VideoRenderer → injects HTML
bindStaticControls()      — search input, sort select (bound once)
bindDynamicFilters()      — category / channel buttons (rebound after refresh)
renderGrid(grid, pgWrap)  — calls FilterManager.apply() → VideoRenderer → updates DOM
exportCSV()               — current filtered set → Blob download
```

---

### `main.js`
Single entry point. One line of logic.
```js
document.addEventListener('DOMContentLoaded', init);
```

---

## 4. Data Flow

```
videos.json
    │
    ▼
VideoManager.load()
    │  normalise + validate + cache
    ▼
VideoManager.all()  ◄──── AppController reads on init
    │
    ▼
FilterManager.apply(videos)
    │  filter → sort → paginate
    ▼
VideoRenderer.buildCard()
    │  pure HTML strings
    ▼
grid.innerHTML = …
    │
    ▼
attachPlayEvents() → ModalPlayer.open(id)
```

State changes (search / filter / sort / page) trigger:
```
user event → FilterManager.set() → notify listeners → renderGrid()
```

---

## 5. Unified Video JSON Format

### Schema

```json
{
  "id":          "IXhmu1aQSOY",
  "title":       "Terry Davis — What do you use Internet Explorer for?",
  "channel":     "davisanism",
  "categories":  ["philosophical", "funny"],
  "description": "Optional — shown in the modal info panel.",
  "upload_date": "20170315",
  "view_count":  87432,
  "duration":    "2:14",
  "thumbnail":   "https://i.ytimg.com/vi/IXhmu1aQSOY/mqdefault.jpg",
  "url":         "https://youtu.be/IXhmu1aQSOY"
}
```

### Field reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | **yes** | 11-char YouTube video ID |
| `title` | string | **yes** | Display title |
| `channel` | string | **yes** | Slug: `"davisanism"` or `"terry"` |
| `categories` | string[] | no | Any strings — detected automatically |
| `description` | string | no | Shown in modal; omit if same as title |
| `upload_date` | string | no | `"YYYYMMDD"` — used for sort |
| `view_count` | number | no | Used for "Popular" threshold |
| `duration` | string | no | Display only: `"4:23"` |
| `thumbnail` | string | no | Falls back to ytimg CDN if omitted |
| `url` | string | no | Falls back to `https://youtu.be/{id}` |

### Rules

- Only `id`, `title`, and `channel` are required.
- Any entry with an invalid `id` or empty `title` is silently skipped.
- All other missing fields receive safe defaults.
- Categories are **free-form strings** — a new category value is picked up
  automatically and added to the filter bar without any code changes.
- A new `channel` value is detected automatically and added to the channel filter.

### Adding a video

Open `videos.json` and append one object:

```json
{
  "id":         "dQw4w9WgXcQ",
  "title":      "Terry Davis Explains the Temple",
  "channel":    "terry",
  "categories": ["programming", "philosophical"],
  "upload_date":"20160504",
  "view_count": 120000
}
```

Save the file. Reload the page. The site automatically:
- detects the new video
- adds its categories to the filter bar (if new)
- adds its channel to the channel filter (if new)
- displays it in the grid
- makes it playable in the modal

No JavaScript changes required.

---

## 6. Module Coupling Matrix

```
           config  utils  VideoMgr  FilterMgr  VideoRnd  ModalPlayer  WikiLoader  AppCtrl
config       —
utils        ✓      —
VideoMgr     ✓      —       —
FilterMgr    ✓      —       —          —
VideoRnd     ✓      ✓       —          —          —
ModalPlayer  ✓      ✓       ✓          —          —          —
WikiLoader   —      ✓       —          —          —          —           —
AppCtrl      ✓      ✓       ✓          ✓          ✓          ✓           ✓          —
```

`config` and `utils` are shared infrastructure — imported widely by design.
`VideoManager` is read-only from the perspective of all other modules.
`FilterManager` is mutated only by `AppController` in response to UI events.
`VideoRenderer` has zero dependencies on mutable state.
`ModalPlayer` has one dependency on `VideoManager` (to look up a video by id).

---

## 7. Adding a New Page

1. Create `newpage.html` with `<body data-page="newpage">`.
2. Add an `initNewPage()` function in `AppController.js`.
3. Add a branch in `init()`:
   ```js
   else if (page === 'newpage') initNewPage();
   ```
4. Import any modules needed inside `initNewPage`.
5. No other files need to change.

---

## 8. Adding a New Channel

1. Add entries to `videos.json` with `"channel": "newchannel"`.
2. Add a label in `config.js`:
   ```js
   CHANNEL_LABELS: {
     davisanism: 'Davisanism',
     terry:      'Terry A. Davis',
     newchannel: 'New Channel Name',
   }
   ```
3. Done. The filter button appears automatically.

---

## 9. Browser Requirements

ES Modules, `fetch`, `DOMParser`, `localStorage` — all available in
every browser released since 2018. No polyfills required.
The site must be served over HTTP(S), not `file://`, because:
- `fetch('videos.json')` requires HTTP
- ES Modules are blocked on `file://` by CORS policy

For local development: `python3 -m http.server 8080`
