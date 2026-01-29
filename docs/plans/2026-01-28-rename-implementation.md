# Rename to "Seek" Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename the workflow from "Alfred-SearXNG-Workflow" to "Seek" across all surfaces while maintaining discoverability.

**Architecture:** Two-phase approach: (1) update all in-repo references first, (2) rename GitHub repo last since it changes URLs.

**Tech Stack:** GitHub CLI, plist editing, markdown updates

**Version:** Bump to 0.2.0 (significant change, not breaking)

---

## Pre-Flight Checks

Before starting, verify:
- [ ] No pending PRs that would break with URL changes
- [ ] Clean working directory (`git status` shows no uncommitted changes)
- [ ] All worktrees cleaned up

---

## Task 1: Clean Up Existing Worktrees

Existing worktree `Alfred-SearXNG-Workflow-issue-23` must be removed before renaming.

**Files:**
- None (git operation)

**Step 1: Check worktree status**

Run: `git worktree list`
Expected: Shows `.worktree/Alfred-SearXNG-Workflow-issue-23`

**Step 2: Remove the worktree**

Run: `rm -rf .worktree/Alfred-SearXNG-Workflow-issue-23 && git worktree prune`
Expected: No output, worktree removed

**Step 3: Verify removal**

Run: `git worktree list`
Expected: Only main worktree listed

---

## Task 2: Remove Old Historical Docs

Clean up old design documents that reference the old name.

**Files:**
- Delete: `docs/plans/2026-01-26-alfred-searxng-workflow-design.md`

**Step 1: Remove old design doc**

Run: `rm docs/plans/2026-01-26-alfred-searxng-workflow-design.md`

**Step 2: Verify removal**

Run: `ls docs/plans/`
Expected: Only `2026-01-27-*` and `2026-01-28-*` files remain

---

## Task 3: Update info.plist - Core Metadata

The Alfred workflow manifest contains the display name, bundle ID, description, and web URL.

**Files:**
- Modify: `info.plist:6` (bundleid)
- Modify: `info.plist:51` (description)
- Modify: `info.plist:55` (name)

**Step 1: Update bundle ID**

Change line 6 from:
```xml
<string>com.ggfevans.alfred-searxng</string>
```
to:
```xml
<string>ca.gvns.seek</string>
```

**Step 2: Update description**

Change line 51 from:
```xml
<string>Search your personal SearXNG instance</string>
```
to:
```xml
<string>SearXNG search for Alfred — private web search with inline results</string>
```

**Step 3: Update workflow name**

Change line 55 from:
```xml
<string>Alfred-SearXNG-Workflow</string>
```
to:
```xml
<string>Seek</string>
```

---

## Task 4: Update info.plist - Alfred UI Text

Update user-visible strings in Alfred to use "Seek" as a verb.

**Files:**
- Modify: `info.plist:84` (runningsubtext)
- Modify: `info.plist:92` (subtext)
- Modify: `info.plist:94` (title)
- Modify: `info.plist:128` (fallback trigger text)

**Step 1: Update running subtext**

Change line 84 from:
```xml
<string>Searching SearXNG...</string>
```
to:
```xml
<string>Seeking...</string>
```

**Step 2: Update subtext**

Change line 92 from:
```xml
<string>Search your SearXNG instance</string>
```
to:
```xml
<string>Private web search via SearXNG</string>
```

**Step 3: Update title**

Change line 94 from:
```xml
<string>SearXNG Search</string>
```
to:
```xml
<string>Seek</string>
```

**Step 4: Update fallback trigger text**

Change line 128 from:
```xml
<string>Search SearXNG</string>
```
to:
```xml
<string>Seek</string>
```

---

## Task 5: Update info.plist - In-Workflow Readme

Update the built-in documentation users see in Alfred preferences.

**Files:**
- Modify: `info.plist:156-211` (readme field)

**Step 1: Update first line**

Change line 156 from:
```
Search your personal SearXNG instance directly from Alfred.
```
to:
```
**Seek** — Private web search via your SearXNG instance.
```

**Step 2: Update fallback reference**

Change line 187 from:
```
3. Click + and find "Search SearXNG" under this workflow
```
to:
```
3. Click + and find "Seek" under this workflow
```

**Step 3: Update keyword reference**

Change line 194 from:
```
- Type `sx` followed by your search query (shows results in Alfred)
```
to:
```
- Type `sx` or `seek` followed by your search query (shows results in Alfred)
```

---

## Task 6: Add `seek` Keyword Alias

Add a second Script Filter with `seek` keyword that triggers the same script.

**Files:**
- Modify: `info.plist` (add new object to objects array)
- Modify: `info.plist` (add connection from new object)

**Approach:** Use Alfred's GUI to add the keyword alias, then sync. Safer than manual plist editing.

**Step 1: Sync current changes TO Alfred first**

Run: `just transfer-changes-TO-local`

**Step 2: Open Alfred workflow**

Run: `just open-local-workflow-in-alfred`

**Step 3: In Alfred GUI**
- Right-click the existing Script Filter (the one with `sx` keyword)
- Duplicate it
- Change keyword from `sx` to `seek`
- Keep all other settings identical
- Connect it to the same "Open URL" action

**Step 4: Sync changes back**

Run: `just transfer-changes-FROM-local`

**Step 5: Verify plist has both keywords**

Run: `grep -A2 '<key>keyword</key>' info.plist`
Expected: Shows both `sx` and `seek`

---

## Task 7: Update package.json

**Files:**
- Modify: `package.json:2` (name field)
- Modify: `package.json:4` (description field)

**Step 1: Update name**

Change:
```json
"name": "alfred-searxng-workflow",
```
to:
```json
"name": "seek",
```

**Step 2: Update description**

Change:
```json
"description": "Alfred workflow for searching with SearXNG",
```
to:
```json
"description": "SearXNG search for Alfred — private web search with inline results",
```

---

## Task 8: Update README.md

**Files:**
- Modify: `README.md`

**Step 1: Update title**

Change line 1:
```markdown
# Alfred SearXNG Workflow
```
to:
```markdown
# Seek: Alfred Workflow for SearXNG
```

**Step 2: Note for later**

Lines 3-5 and 20 reference `ggfevans/Alfred-SearXNG-Workflow`. These will be updated in Task 14 after the GitHub rename.

---

## Task 9: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update worktree examples**

Change lines 17-21:
```bash
# Create worktree for issue work
git worktree add .worktree/Seek-issue-<N> -b <type>/<N>-<description>

# Examples:
git worktree add .worktree/Seek-issue-16 -b feat/16-testing-infrastructure
git worktree add .worktree/Seek-issue-2 -b fix/2-shell-injection
```

---

## Task 10: Update ROADMAP.md

**Files:**
- Modify: `ROADMAP.md:3`

**Step 1: Update project name reference**

Change:
```markdown
This document outlines the planned development path for Alfred-SearXNG-Workflow.
```
to:
```markdown
This document outlines the planned development path for Seek.
```

---

## Task 11: Update scripts/search.js

**Files:**
- Modify: `scripts/search.js:3`

**Step 1: Update header comment**

Change:
```javascript
// Alfred SearXNG Workflow - Main Script Filter
```
to:
```javascript
// Seek - SearXNG Search for Alfred
```

---

## Task 12: Bump Version to 0.2.0

**Files:**
- Modify: `info.plist:310` (version)
- Modify: `package.json:3` (version)

**Step 1: Update info.plist version**

Change line 310 from:
```xml
<string>0.1.0</string>
```
to:
```xml
<string>0.2.0</string>
```

**Step 2: Update package.json version**

Change:
```json
"version": "0.1.0",
```
to:
```json
"version": "0.2.0",
```

---

## Task 13: Rename GitHub Repository

**IMPORTANT:** Do this task LAST before final URL updates. It changes all URLs immediately.

**Files:**
- None (GitHub operation)

**Step 1: Rename via GitHub CLI**

Run: `gh repo rename Seek`

Expected: Repository renamed, redirects set up automatically

**Step 2: Verify rename**

Run: `gh repo view --json name,url`
Expected: Shows `"name": "Seek"` and new URL

**Step 3: Update git remote**

Run: `git remote set-url origin https://github.com/ggfevans/Seek.git`

**Step 4: Verify remote**

Run: `git remote get-url origin`
Expected: `https://github.com/ggfevans/Seek.git`

---

## Task 14: Final URL Updates

Now that GitHub repo is renamed, update all URL references.

**Files:**
- Modify: `info.plist:312` (webaddress)
- Modify: `README.md:3-5,20` (badges and links)

**Step 1: Update info.plist webaddress**

Change line 312 from:
```xml
<string>https://github.com/ggfevans/Alfred-SearXNG-Workflow</string>
```
to:
```xml
<string>https://github.com/ggfevans/Seek</string>
```

**Step 2: Update README badges**

Change lines 3-5 to:
```markdown
[![GitHub Downloads](https://img.shields.io/github/downloads/ggfevans/Seek/total?style=flat-square&logo=github)](https://github.com/ggfevans/Seek/releases)
[![Latest Release](https://img.shields.io/github/v/release/ggfevans/Seek?style=flat-square)](https://github.com/ggfevans/Seek/releases/latest)
[![License](https://img.shields.io/github/license/ggfevans/Seek?style=flat-square)](LICENSE)
```

**Step 3: Update README installation link**

Change line 20 to:
```markdown
1. Download the latest `.alfredworkflow` from [Releases](https://github.com/ggfevans/Seek/releases/latest)
```

---

## Task 15: Update GitHub Metadata

**Files:**
- None (GitHub operation)

**Step 1: Update description**

Run: `gh repo edit --description "SearXNG search for Alfred — private web search with inline results"`

**Step 2: Update topics**

Run: `gh repo edit --add-topic searxng --add-topic alfred-workflow --add-topic alfred --add-topic search --add-topic privacy --add-topic macos`

**Step 3: Verify metadata**

Run: `gh repo view --json description,repositoryTopics`

---

## Task 16: Commit and Push

**Files:**
- All modified files

**Step 1: Review all changes**

Run: `git status && git diff`
Verify all changes look correct.

**Step 2: Stage and commit**

```bash
git add -A
git commit -m "chore: rename workflow to Seek (v0.2.0)

- Rename workflow to 'Seek' with bundle ID ca.gvns.seek
- Add 'seek' keyword alias alongside 'sx'
- Update Alfred UI text (Seek, Seeking...)
- Update README title to 'Seek: Alfred Workflow for SearXNG'
- Update all documentation references
- Remove old historical design doc
- Bump version to 0.2.0

Implements naming decision from docs/plans/2026-01-28-naming-design.md

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

**Step 3: Push**

Run: `git push`

---

## Post-Implementation Verification

- [ ] `sx` keyword works in Alfred
- [ ] `seek` keyword works in Alfred
- [ ] Alfred shows "Seek" as workflow name
- [ ] Alfred shows "Seeking..." while running
- [ ] Fallback search shows "Seek"
- [ ] GitHub repo shows as "Seek"
- [ ] GitHub description shows SearXNG prominently
- [ ] README displays correctly with new badges
- [ ] Version shows 0.2.0 in both info.plist and package.json

---

## Edge Cases & Risks

### GitHub URL Redirects
- **Risk:** Old links break
- **Mitigation:** GitHub auto-redirects old repo URLs to new name
- **Note:** Redirects work indefinitely unless a new repo with old name is created

### Search/SEO
- **Risk:** People searching "alfred searxng" might not find "Seek"
- **Mitigation:** "SearXNG" prominent in description, topics, README title

### Alfred Gallery
- **Risk:** If submitted before rename, Gallery listing may have old name
- **Mitigation:** Not yet submitted; rename before submission

### Worktree Naming Convention
- **Risk:** CLAUDE.md pattern uses repo name in worktree path
- **Mitigation:** Updated in Task 9 to use "Seek-issue-N"

### Local Alfred Workflow
- **Risk:** Bundle ID change means Alfred treats as new workflow
- **Mitigation:** Acceptable since no external users yet. Reinstall workflow after changes.
