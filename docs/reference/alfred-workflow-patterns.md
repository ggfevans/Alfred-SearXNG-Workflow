# Alfred Workflow Reference Patterns

Research compiled from analyzing top Alfred workflow libraries on GitHub.
**Last updated:** 2026-01-27
**Local repos:** `/Users/gvns/code/reference/Alfred/`

---

## Top Reference Libraries

### Tier 1: Essential Libraries (Architecture Gold Standards)

| Library | Stars | Language | Key Learnings |
|---------|-------|----------|---------------|
| [deanishe/alfred-workflow](https://github.com/deanishe/alfred-workflow) | 3,000 | Python | `cached_data()` with `max_age`, background tasks, fuzzy filtering with diacritics, keychain, update via GitHub releases |
| [sindresorhus/alfy](https://github.com/sindresorhus/alfy) | 2,600 | Node.js | Cache auto-invalidation on version change, `alfy-test` for testing, npm distribution |
| [deanishe/awgo](https://github.com/deanishe/awgo) | 875 | Go | Subpackage organization, Options pattern, 3-level caching, magic actions, panic recovery |

### Tier 2: JXA-Specific References (Directly Applicable)

| Library | Stars | Notes |
|---------|-------|-------|
| [robbieg8s/alfred-workflows](https://github.com/robbieg8s/alfred-workflows) | 2 | TypeScript/JXA monorepo with 8 CLI tools, NSURLSession HTTP, Keychain API, esbuild |
| [15cm/Alfred-Workflow-JXA](https://github.com/15cm/Alfred-Workflow-JXA) | 5 | JXA `require()` hack, cache age via NSFileManager attributes |

### Tier 3: Advanced UX Patterns

| Repo | Patterns |
|------|----------|
| [zeitlings/alfred-workflows](https://github.com/zeitlings/alfred-workflows) | 30+ workflows: QuickLook, Universal Actions, modifier keys, Swift for performance |

---

## Deep Dive: robbieg8s/alfred-workflows

**Location:** `/Users/gvns/code/reference/Alfred/alfred-workflows/`

### Directory Structure (Monorepo)
```
alfred-workflows/
├── jxa/                          # Shared JXA/macOS bridge library
│   ├── src/
│   │   ├── api.d.ts             # Global JXA types ($, ObjC, Application)
│   │   ├── alfred.ts            # Script filter/run script handlers
│   │   ├── appkit.ts            # Clipboard, URL, windows
│   │   ├── execute-process.ts   # NSTask process wrapper
│   │   └── sundry.ts            # DetailedError, dialogs
├── tools/                        # 8 CLI tools for workflow management
│   ├── src/entry-points/
│   │   ├── bootstrap-workflow.ts
│   │   ├── bundle-workflow.ts   # Compile TS → osascript
│   │   ├── export-workflow.ts   # Package → .alfredworkflow
│   │   ├── import-workflow.ts   # Pull Alfred UI changes
│   │   ├── link-workflow.ts     # Symlink to Alfred prefs
│   │   ├── lint-workflow.ts     # Verify plist ↔ package.json
│   │   ├── update-workflow.ts   # Push to live workflow
│   │   └── upversion-workflow.ts
│   └── src/
│       ├── sync.ts              # Timestamp-based file sync
│       ├── alfred.ts            # Alfred prefs parsing
│       └── info-plist.ts        # XSLT-based plist parsing
└── workflows/
    ├── atlassian/               # Complex: GraphQL, Keychain, NSURLSession
    ├── browser-tabs/
    └── safari-history/
```

### Key Pattern: scriptFilter() Wrapper

**File:** `jxa/src/alfred.ts`

```javascript
// Wraps handler with error→Alfred item conversion
export const scriptFilter = (
  handler: (query: string | undefined) => AlfredScriptFilterItem[]
): ((argv: string[]) => string) => {
  return (argv: string[]) => {
    try {
      const [query] = argv;
      return JSON.stringify({ items: handler(query) });
    } catch (error) {
      // CRITICAL: Render errors as Alfred items with valid: false
      return JSON.stringify({
        items: [{
          title: "Internal Error",
          subtitle: error.message,
          valid: false
        }]
      });
    }
  };
};

// Usage in workflow:
run = scriptFilter((query) => {
  return [{ title: "Result 1", arg: "action", match: "searchable" }];
});
```

### Key Pattern: DetailedError Class

**File:** `jxa/src/sundry.ts`

```javascript
export class DetailedError extends Error {
  constructor(message: string, public readonly details: string[]) {
    super(message);
  }
}

export const detailedError = (message: string, ...details: string[]) =>
  new DetailedError(message, details);

// Usage: Multi-line error output
throw detailedError(
  "Search API failed",
  "Reason: timeout",
  "URL: " + searxng_url,
  "Try: increase timeout_ms workflow variable"
);
```

### Key Pattern: NSURLSession for HTTP

**File:** `workflows/atlassian/src/scripts/atlassian-activity.ts`

```javascript
ObjC.import("Cocoa");

const urlSession = $.NSURLSession.sessionWithConfigurationDelegateDelegateQueue(
  $.NSURLSessionConfiguration.ephemeralSessionConfiguration,  // No persistent cache
  null,
  $.NSOperationQueue.currentQueue,
);

// Parallel requests with completion handlers
const dataTask = urlSession.dataTaskWithRequestCompletionHandler(
  urlRequest,
  (data, response, error) => {
    if (error) {
      errorByAccount.set(account, error);
    } else {
      dataByAccount.set(account, data);
    }
  }
);

dataTask.resume();
```

**Advantages over curl:**
- Better timeout handling
- Connection pooling
- Better error reporting
- Non-blocking via NSOperationQueue

### Key Pattern: macOS Keychain Integration

**File:** `workflows/atlassian/src/security.ts`

```javascript
ObjC.import("Security");

export const queryAccountToken = (account: string): string | undefined => {
  const query = securityDictionary(
    [$.kSecAttrAccount, cfString(account)],
    [$.kSecReturnData, $.kCFBooleanTrue],
    [$.kSecMatchLimit, $.kSecMatchLimitOne]
  );

  const result = $();  // Pass-by-reference box
  const status = $.SecItemCopyMatching(query, result);

  if (status !== 0) return undefined;
  return nsDataUtf8ToString(result);
};

export const createAccount = (account: string, token: string) => {
  const status = $.SecItemAdd(
    securityDictionary(
      [$.kSecAttrAccount, cfString(account)],
      [$.kSecValueData, stringToNSDataUtf8(token)]
    ),
    null
  );
  if (status !== 0) throw securityError(status);
};
```

### Key Pattern: esbuild for JXA

**File:** `tools/src/entry-points/bundle-workflow.ts`

```javascript
await esbuild.build({
  banner: {
    js: "#!/usr/bin/osascript -lJavaScript",  // CRITICAL: shebang
  },
  bundle: true,
  entryPoints: ["src/scripts/*.ts"],
  format: "iife",                              // Self-executing function
  platform: "neutral",                         // NOT node/browser
  tsconfigRaw: {},                             // Avoid "use strict"
  minify: true,
  outdir: kDist,
});
```

### Key Pattern: Sync Protection

**File:** `tools/src/sync.ts`

```javascript
// update-workflow FAILS if target has newer files (protects dev work)
// import-workflow checks git status before pulling (prevents data loss)

const gitResponses = await Promise.all([
  gitCz(kRaw, "diff-index", "--cached", "HEAD"),     // staged
  gitCz(kRaw, "diff-files"),                          // unstaged
  gitCz(kRaw, "ls-files", "--others", "--exclude-standard"),
]);
// Raises error if any to-be-changed files have git status
```

---

## Deep Dive: sindresorhus/alfy

**Location:** `/Users/gvns/code/reference/Alfred/alfy/`

### Key Pattern: Version-Aware Caching

**File:** `index.js` (lines 116-120)

```javascript
import CacheConf from 'cache-conf';

alfy.cache = new CacheConf({
  configName: 'cache',
  cwd: alfy.alfred.cache,
  version: alfy.meta.version,  // ← Auto-invalidates on version change
});
```

**Adaptation for JXA:**
```javascript
function getCacheVersionDir() {
  const cacheDir = getEnv("alfred_workflow_cache", "");
  const version = getEnv("alfred_workflow_version", "0.0.0");
  const versionedDir = `${cacheDir}/v${version}`;
  app.doShellScript(`mkdir -p ${shellEscape(versionedDir)}`);
  return versionedDir;
}
```

### Key Pattern: Fetch with Cache + Stale Fallback

**File:** `index.js` (lines 122-175)

```javascript
alfy.fetch = async (url, options) => {
  const key = url + JSON.stringify(options);

  // 1. Check cache first
  const cached = alfy.cache.get(key, {ignoreMaxAge: true});
  if (cached && !alfy.cache.isExpired(key)) {
    return cached;  // Fresh cache - no network
  }

  // 2. Fetch from network
  let response;
  try {
    response = await got(url, options);
  } catch (error) {
    // 3. On failure, return STALE cache if available
    if (cached) return cached;
    throw error;
  }

  // 4. Transform before caching
  const data = options.transform ? options.transform(response) : response;

  // 5. Cache with TTL
  if (options.maxAge) {
    alfy.cache.set(key, data, {maxAge: options.maxAge});
  }

  return data;
};
```

### Key Pattern: Global Error Handler

**File:** `index.js` (lines 77-107)

```javascript
alfy.error = error => {
  const stack = cleanStack(error.stack || error);
  const title = error.stack ? `${error.name}: ${error.message}` : String(error);

  const copy = `
\`\`\`
${stack}
\`\`\`

-
${alfy.meta.name} ${alfy.meta.version}
Alfred ${alfy.alfred.version}
${process.platform} ${os.release()}
  `.trim();

  alfy.output([{
    title,
    subtitle: 'Press ⌘L to see full error and ⌘C to copy.',
    valid: false,
    text: { copy, largetype: stack },
    icon: { path: alfy.icon.error },
  }]);
};

// Global handlers
loudRejection(alfy.error);
process.on('uncaughtException', alfy.error);

// Empty output safeguard (fixes JSON parse errors)
process.on('beforeExit', () => {
  if (!hasOutput) alfy.output([]);
});
```

### Key Pattern: Three-Layer Data Storage

```javascript
// 1. Workflow metadata (read-only from env)
alfy.meta = {
  name: getEnv('workflow_name'),
  version: getEnv('workflow_version'),
  bundleId: getEnv('workflow_bundleid'),
};

// 2. Persistent config (unlimited writes)
alfy.config = new Conf({
  cwd: alfy.alfred.data,
});

// 3. Temporary cache (TTL-aware, version-scoped)
alfy.cache = new CacheConf({
  cwd: alfy.alfred.cache,
  version: alfy.meta.version,
});
```

---

## Deep Dive: deanishe/awgo

**Location:** `/Users/gvns/code/reference/Alfred/awgo/`

### Key Pattern: Options Pattern (Reversible Configuration)

```go
type Option func(wf *Workflow) Option

// Every option returns its inverse
func SuppressUIDs(on bool) Option {
  return func(wf *Workflow) Option {
    prev := wf.Feedback.NoUIDs
    wf.Feedback.NoUIDs = on
    return SuppressUIDs(prev)  // Returns undo function
  }
}

// Composable initialization
wf := aw.New(
  aw.MaxResults(20),
  aw.HelpURL("https://..."),
  aw.Update(updater),
)

// Temporary changes with automatic undo
undo := wf.Configure(aw.SuppressUIDs(true))
// ... do something
undo(wf)  // Restore
```

### Key Pattern: Three-Level Cache Hierarchy

```go
// Level 1: File-based generic cache
type Cache struct { Dir string }
func (c Cache) LoadOrStore(name string, maxAge time.Duration,
    reload func() ([]byte, error)) ([]byte, error)

// Level 2: Session-scoped cache (expires when Alfred closes)
type Session struct {
  SessionID string
  cache     *Cache
}
// Stores under: _aw_session.{sessionID}.{name}

// Level 3: Update cache
// Stored in: {cacheDir}/_aw/update/
// - Downloads.json (releases list)
// - LastCheckTime.txt (timestamp)
```

### Key Pattern: Magic Actions (Debug Commands)

```go
type MagicAction interface {
  Keyword() string        // "log", "cache", "update"
  Description() string
  Run() error
}

// Built-in actions (triggered via "workflow:log", etc.)
// - workflow:log      → Open log file
// - workflow:cache    → Open cache directory
// - workflow:delcache → Delete cache
// - workflow:data     → Open data directory
// - workflow:reset    → Delete all data/cache
// - workflow:help     → Open help URL
// - workflow:update   → Check and install updates
```

### Key Pattern: Background Tasks with PID Tracking

```go
func (wf *Workflow) RunInBackground(jobName string, cmd *exec.Cmd) error {
  if wf.IsRunning(jobName) {
    return ErrJobExists{jobName, pid}
  }

  // Detach from parent process group
  cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

  err := cmd.Start()
  return wf.savePid(jobName, cmd.Process.Pid)
}

func (wf *Workflow) IsRunning(jobName string) bool {
  pid, err := wf.getPid(jobName)
  if err != nil { return false }

  // Signal 0 checks if process exists without killing it
  if syscall.Kill(pid, 0) != nil {
    os.Remove(wf.pidFile(jobName))  // Cleanup stale
    return false
  }
  return true
}
```

### Key Pattern: Update System (3-Layer)

```go
// Layer 1: Generic Updater
type Updater struct {
  Source         Source
  CurrentVersion SemVer
  updateInterval time.Duration  // 24h default
}

// Layer 2: Source interface (DI)
type Source interface {
  Downloads() ([]Download, error)
}

// Layer 3: GitHub implementation
func GitHub(repo string) aw.Option {
  return newOption(&source{
    URL: "https://api.github.com/repos/" + repo + "/releases",
  })
}
```

---

## Deep Dive: 15cm/Alfred-Workflow-JXA

**Location:** `/Users/gvns/code/reference/Alfred/Alfred-Workflow-JXA/`

### Key Pattern: require() Hack

**File:** `README.md`

```javascript
ObjC.import('Foundation');
var fm = $.NSFileManager.defaultManager;

var require = function (path) {
  var contents = fm.contentsAtPath(path.toString());  // NSData
  contents = $.NSString.alloc.initWithDataEncoding(
    contents, $.NSUTF8StringEncoding
  );

  var module = {exports: {}};
  var exports = module.exports;
  eval(ObjC.unwrap(contents));

  return module.exports;
};

// Usage:
var lib = require('./lib/workflow.js');
```

### Key Pattern: Cache Age via NSFileManager

**File:** `workflow/workflow.js`

```javascript
WorkFlow.prototype._cacheAge = function () {
  var oFileManager = $.NSFileManager.defaultManager;

  if (!oFileManager.fileExistsAtPath(this.cachePath)) {
    return Number.MAX_VALUE;
  }

  var oFileAttrs = oFileManager.attributesOfItemAtPathError(
    this.cachePath, null
  );
  var oCreateDate = oFileAttrs.objectForKey(
    ObjC.unwrap($.NSFileCreationDate)
  );

  return ((new Date().getTime()) - ObjC.unwrap(oCreateDate).getTime()) / 1000;
};

WorkFlow.prototype.cacheData = function(funcGenItemList, maxAge) {
  if (this._cacheAge() <= maxAge) {
    this.cacheItems = this._cacheFetch();
  } else {
    this.cacheItems = funcGenItemList();
    this._cacheStore(this.cacheItems);
  }
};
```

---

## Alfred JSON: Full Item Schema

```javascript
{
  "items": [{
    // Required
    "title": "Result Title",

    // Recommended
    "subtitle": "Description text",
    "arg": "value-passed-to-next-action",
    "autocomplete": "text-on-tab",
    "uid": "unique-id-for-learning",

    // UX Enhancements
    "quicklookurl": "https://example.com/preview",  // Shift to preview
    "icon": {
      "type": "fileicon",  // or "filetype"
      "path": "/path/to/file"
    },
    "match": "custom search text",  // For Alfred filtering

    // Modifier Keys
    "mods": {
      "cmd": {
        "valid": true,
        "arg": "alternate-arg",
        "subtitle": "Hold Cmd: Copy URL"
      },
      "alt": {
        "valid": true,
        "arg": "another-arg",
        "subtitle": "Hold Alt: Open in browser"
      },
      "cmd+alt": {
        "subtitle": "Combined modifiers work too"
      }
    },

    // Copy/Large Type
    "text": {
      "copy": "Text copied with Cmd+C",
      "largetype": "Text shown with Cmd+L"
    },

    // Universal Actions (Alfred 4+)
    "action": {
      "text": "Text for actions",
      "url": "https://example.com",
      "file": "/path/to/file"
    },

    // Variables (passed through workflow)
    "variables": {
      "custom_var": "value"
    }
  }],

  // Script Filter Options
  "rerun": 0.5,  // Re-run every 0.5s (progress indicators)
  "cache": {
    "seconds": 300,
    "loosereload": true  // Show cached, refresh in background
  },
  "skipknowledge": false  // Enable/disable Alfred learning
}
```

---

## Improvement Opportunities for SearXNG Workflow

Based on the reference codebases, here are concrete improvements:

### 1. Enhanced Error Output
```javascript
function alfredError(title, subtitle, details = {}) {
  const version = getEnv("alfred_workflow_version", "unknown");
  const alfredVersion = getEnv("alfred_version", "unknown");

  const debugInfo = `
${title}: ${subtitle}

Details:
${JSON.stringify(details, null, 2)}

Workflow: v${version}
Alfred: ${alfredVersion}
  `.trim();

  return {
    title: title,
    subtitle: subtitle,
    valid: false,
    text: { copy: debugInfo, largetype: debugInfo },
    icon: { path: "icon.png" },
  };
}
```

### 2. Search Results Caching (Alfred Native)
```javascript
return {
  items: items,
  cache: {
    seconds: 60,
    loosereload: true,  // Show cached, refresh in background
  },
};
```

### 3. Quick Look for Results
```javascript
return {
  title: result.title,
  subtitle: truncate(result.content, 80),
  arg: result.url,
  quicklookurl: result.url,  // Shift to preview
  mods: {
    cmd: {
      arg: result.url,
      subtitle: "⌘: Copy URL to clipboard",
    },
    alt: {
      arg: result.pretty_url || result.url,
      subtitle: "⌥: Copy clean URL",
    },
  },
  text: {
    copy: result.url,
    largetype: result.title + "\n\n" + result.url,
  },
};
```

### 4. Version-Aware Favicon Cache
```javascript
// Current: favicons stored in single directory
// Improved: version-scoped cache directory
function getFaviconCacheDir() {
  const cacheDir = getEnv("alfred_workflow_cache", "");
  const version = getEnv("alfred_workflow_version", "0.0.0");
  return `${cacheDir}/favicons_v${version}`;
}
```

### 5. Update Notifications
```javascript
// Check for updates via GitHub API (once per day)
function checkForUpdates() {
  const lastCheck = readConfig("lastUpdateCheck", 0);
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  if (now - lastCheck < dayMs) return null;

  writeConfig("lastUpdateCheck", now);

  const response = httpGet(
    "https://api.github.com/repos/user/repo/releases/latest",
    5
  );
  if (!response.success) return null;

  const release = JSON.parse(response.data);
  const currentVersion = getEnv("alfred_workflow_version", "0.0.0");

  if (semverCompare(release.tag_name, currentVersion) > 0) {
    return {
      title: `Update available: ${release.tag_name}`,
      subtitle: "Press Enter to download",
      arg: release.html_url,
      icon: { path: "update.png" },
    };
  }
  return null;
}
```

---

## UX Best Practices Summary

| Feature | Pattern | Benefit |
|---------|---------|---------|
| `quicklookurl` | URL for web results | Shift to preview without opening browser |
| `mods` | cmd/alt/shift variants | Multiple actions per result |
| `text.copy` | Clean text for clipboard | Cmd+C copies useful text |
| `text.largetype` | Full content | Cmd+L shows full details |
| `cache.loosereload` | Native caching | Instant results, background refresh |
| `rerun` | Progress polling | Live updates for long operations |
| `match` | Custom search text | Better Alfred filtering |
| `action` | Universal Actions | Cross-workflow integration |

---

## Local Reference Files

| File | Purpose |
|------|---------|
| `/Users/gvns/code/reference/Alfred/alfred-workflows/jxa/src/alfred.ts` | scriptFilter wrapper, error handling |
| `/Users/gvns/code/reference/Alfred/alfred-workflows/jxa/src/sundry.ts` | DetailedError class |
| `/Users/gvns/code/reference/Alfred/alfred-workflows/workflows/atlassian/src/security.ts` | Keychain pattern |
| `/Users/gvns/code/reference/Alfred/alfy/index.js` | Caching, fetch, error handling |
| `/Users/gvns/code/reference/Alfred/awgo/workflow.go` | Workflow struct, options |
| `/Users/gvns/code/reference/Alfred/awgo/cache.go` | 3-level caching |
| `/Users/gvns/code/reference/Alfred/awgo/magic.go` | Magic actions system |
| `/Users/gvns/code/reference/Alfred/Alfred-Workflow-JXA/workflow/workflow.js` | JXA caching |

---

## Sources

- [Alfred Script Filter JSON](https://www.alfredapp.com/help/workflows/inputs/script-filter/json/)
- [deanishe/alfred-workflow docs](http://www.deanishe.net/alfred-workflow/)
- [awesome-alfred-workflows](https://github.com/alfred-workflows/awesome-alfred-workflows)
- [Alfred Gallery](https://alfred.app/workflows/)
