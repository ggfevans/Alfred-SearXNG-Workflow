# Bang Modifiers Design

**Date:** 2026-01-27
**Status:** Approved
**Supersedes:** Issues #6, #7, #12

## Summary

Replace multiple keyword approach (`sx`, `sxi`, `sxn`) with a single keyword (`sx`) plus inline bang modifiers for categories and time filters.

## User Experience

```
sx cats                     → general search for "cats"
sx !i cats                  → image search for "cats"
sx cats !images             → same (position doesn't matter)
sx !news !w climate         → news from past week about "climate"
sx !v !m music tutorials    → videos from past month
sx !maps coffee             → map search for "coffee"
```

### Bang Reference

| Category | Long | Short |
|----------|------|-------|
| Images | `!images` | `!i` |
| News | `!news` | `!n` |
| Videos | `!videos` | `!v` |
| Maps | `!maps` | *(none)* |

| Time Range | Bang |
|------------|------|
| Past day | `!d` |
| Past week | `!w` |
| Past month | `!m` |
| Past year | `!y` |

**Note:** `!maps` has no short form because `!m` is reserved for "month".

### Behavior

- Bangs are case-insensitive (`!I` = `!i`)
- Bangs can appear anywhere in the query
- Multiple bangs combine (one category + one time filter)
- Last bang wins if duplicates (`!i !n cats` → news)
- Unknown bangs remain in query as literal text

## Implementation

### Bang Parser

```javascript
function parseBangs(query) {
  const bangs = {
    categories: {
      '!images': 'images', '!i': 'images',
      '!news': 'news', '!n': 'news',
      '!videos': 'videos', '!v': 'videos',
      '!maps': 'maps'
    },
    timeRanges: {
      '!d': 'day', '!w': 'week', '!m': 'month', '!y': 'year'
    }
  };

  let category = null;
  let timeRange = null;
  let cleanQuery = query;

  // Extract category bangs (case-insensitive)
  for (const [bang, value] of Object.entries(bangs.categories)) {
    const regex = new RegExp(`\\s*${bang}\\b`, 'gi');
    if (regex.test(cleanQuery)) {
      category = value;
      cleanQuery = cleanQuery.replace(regex, '');
    }
  }

  // Extract time range bangs
  for (const [bang, value] of Object.entries(bangs.timeRanges)) {
    const regex = new RegExp(`\\s*${bang}\\b`, 'gi');
    if (regex.test(cleanQuery)) {
      timeRange = value;
      cleanQuery = cleanQuery.replace(regex, '');
    }
  }

  return {
    query: cleanQuery.trim(),
    category,
    timeRange
  };
}
```

### SearXNG API Integration

```javascript
// Build search URL with optional category and time_range params
let searchUrl = `${searxngUrl}/search?q=${encodeURIComponent(parsed.query)}&format=json`;

if (parsed.category) {
  searchUrl += `&categories=${encodeURIComponent(parsed.category)}`;
}

if (parsed.timeRange) {
  searchUrl += `&time_range=${encodeURIComponent(parsed.timeRange)}`;
}
```

### UI Feedback

**Empty state subtitle:**
```
Images · Past week    (when bangs detected)
Type a query to search (default)
```

**Result item subtitle:**
```
imgur.com · Images · Adorable cat compilation...
```

**Fallback item:**
```
Search "cats" in browser
Open SearXNG web interface (Images · Past week)
```

## Files to Modify

| File | Changes |
|------|---------|
| `scripts/search.js` | Add `parseBangs()`, update `search()`, update subtitles |

## Test Cases

```javascript
parseBangs('!i cats')        // { query: 'cats', category: 'images', timeRange: null }
parseBangs('cats !images')   // { query: 'cats', category: 'images', timeRange: null }
parseBangs('!n !w climate')  // { query: 'climate', category: 'news', timeRange: 'week' }
parseBangs('!I CATS')        // { query: 'CATS', category: 'images', ... }
parseBangs('!foo bar')       // { query: '!foo bar', category: null, ... }
parseBangs('!maps !m test')  // { query: 'test', category: 'maps', timeRange: 'month' }
```

## Issue Resolution

- **#6 (category keywords):** Superseded — bangs replace `sxi`, `sxn`, `sxv`
- **#7 (time range filters):** Implemented by this design
- **#12 (configurable keywords):** Closed as won't-do — single `sx` keyword is sufficient
