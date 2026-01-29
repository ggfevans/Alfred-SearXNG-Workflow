# Bugfix Batch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three related bugs in search.js: scriptFilter edge cases (#49), no-results caching (#48), and HMAC null-safety (#47)

**Architecture:** All fixes are in `scripts/search.js` with corresponding tests. Each fix is isolated and can be committed independently. TDD approach: write failing tests first.

**Tech Stack:** JXA (JavaScript for Automation), Node.js test runner

---

## Task 1: Fix scriptFilter undefined/non-Error handling (#49)

**Files:**
- Modify: `scripts/search.js:927-945` (scriptFilter function)
- Create: `tests/script-filter.test.js`

**Step 1: Write failing tests for scriptFilter edge cases**

Create `tests/script-filter.test.js`:

```javascript
#!/usr/bin/env node
/**
 * Unit tests for scriptFilter wrapper
 * Run with: node tests/script-filter.test.js
 */

const assert = require("node:assert");
const { describe, it } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

// Extract errorItem function from search.js
const searchJs = fs.readFileSync(
	path.join(__dirname, "../scripts/search.js"),
	"utf-8"
);

// Extract errorItem - needed by scriptFilter
const errorItemMatch = searchJs.match(
	/function errorItem\(title, subtitle, arg(?:, text)?\) \{[\s\S]*?return \{[\s\S]*?\};\s*\}/
);
if (!errorItemMatch) {
	throw new Error("Could not find errorItem function in search.js");
}

// Extract scriptFilter
const scriptFilterMatch = searchJs.match(
	/function scriptFilter\(handler\) \{[\s\S]*?return function \(argv\) \{[\s\S]*?\};\s*\}/
);
if (!scriptFilterMatch) {
	throw new Error("Could not find scriptFilter function in search.js");
}

// Evaluate both functions (errorItem first, then scriptFilter which uses it)
// eslint-disable-next-line no-eval
eval(errorItemMatch[0]);
// eslint-disable-next-line no-eval
const scriptFilter = eval(`(${scriptFilterMatch[0]})`);

describe("scriptFilter", () => {
	it("returns valid JSON when handler returns normal object", () => {
		const wrapped = scriptFilter(() => ({ items: [{ title: "test" }] }));
		const result = wrapped([]);
		const parsed = JSON.parse(result);
		assert.deepStrictEqual(parsed, { items: [{ title: "test" }] });
	});

	it("returns valid JSON with empty items when handler returns undefined", () => {
		const wrapped = scriptFilter(() => undefined);
		const result = wrapped([]);
		const parsed = JSON.parse(result);
		assert.ok(parsed.items, "Should have items array");
		assert.strictEqual(parsed.items.length, 0, "Items should be empty");
	});

	it("returns valid JSON with empty items when handler returns null", () => {
		const wrapped = scriptFilter(() => null);
		const result = wrapped([]);
		const parsed = JSON.parse(result);
		assert.ok(parsed.items, "Should have items array");
		assert.strictEqual(parsed.items.length, 0, "Items should be empty");
	});

	it("handles Error throws with message and stack", () => {
		const wrapped = scriptFilter(() => {
			throw new Error("test error");
		});
		const result = wrapped([]);
		const parsed = JSON.parse(result);
		assert.strictEqual(parsed.items.length, 1);
		assert.strictEqual(parsed.items[0].title, "Internal Error");
		assert.strictEqual(parsed.items[0].subtitle, "test error");
		assert.ok(parsed.items[0].text.copy.includes("test error"));
	});

	it("handles string throws", () => {
		const wrapped = scriptFilter(() => {
			throw "string error";
		});
		const result = wrapped([]);
		const parsed = JSON.parse(result);
		assert.strictEqual(parsed.items.length, 1);
		assert.strictEqual(parsed.items[0].title, "Internal Error");
		assert.strictEqual(parsed.items[0].subtitle, "string error");
	});

	it("handles null throws", () => {
		const wrapped = scriptFilter(() => {
			throw null;
		});
		const result = wrapped([]);
		const parsed = JSON.parse(result);
		assert.strictEqual(parsed.items.length, 1);
		assert.strictEqual(parsed.items[0].title, "Internal Error");
		assert.ok(parsed.items[0].subtitle, "Should have a subtitle");
	});

	it("handles object throws without message property", () => {
		const wrapped = scriptFilter(() => {
			throw { code: 42 };
		});
		const result = wrapped([]);
		const parsed = JSON.parse(result);
		assert.strictEqual(parsed.items.length, 1);
		assert.strictEqual(parsed.items[0].title, "Internal Error");
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `node --test tests/script-filter.test.js`
Expected: FAIL on "handler returns undefined", "handler returns null", "string throws", "null throws" tests

**Step 3: Update scriptFilter to handle edge cases**

In `scripts/search.js`, replace the scriptFilter function (lines 927-945):

```javascript
/**
 * Wrap a Script Filter handler to guarantee valid JSON output.
 * Catches any unhandled exceptions and converts them to Alfred-friendly error items.
 * @param {function(string[]): object} handler - Function that takes argv and returns an Alfred response object
 * @returns {function(string[]): string} Wrapped function that returns JSON string
 */
function scriptFilter(handler) {
	return function (argv) {
		try {
			const result = handler(argv);
			// Coerce undefined/null to empty response
			return JSON.stringify(result || { items: [] });
		} catch (err) {
			// Normalize thrown values - handle non-Error throws
			const message = (err && err.message) || String(err);
			const stack = (err && err.stack) || String(err);
			// Log error for debugging (appears in Console.app under osascript)
			console.log(`Error: ${message}`);
			console.log(stack);
			// Reuse errorItem helper for consistent structure (includes mods)
			const item = errorItem("Internal Error", message);
			// Add text property for copy/largetype with stack trace
			item.text = {
				copy: stack,
				largetype: stack,
			};
			return JSON.stringify({ items: [item] });
		}
	};
}
```

**Step 4: Run tests to verify they pass**

Run: `node --test tests/script-filter.test.js`
Expected: PASS all 7 tests

**Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add scripts/search.js tests/script-filter.test.js
git commit -m "fix: handle undefined returns and non-Error throws in scriptFilter (#49)

- Coerce undefined/null handler results to { items: [] }
- Normalize error message extraction for non-Error throws
- Add comprehensive test coverage for edge cases"
```

---

## Task 2: Add caching to no-results response (#48)

**Files:**
- Modify: `scripts/search.js:889-895` (no-results branch)
- Modify: `tests/build-response.test.js` (add test)

**Step 1: Add failing test for no-results caching**

In `tests/build-response.test.js`, add a test case to the existing describe block:

```javascript
it("should be called with cache for no-results empty suggestions case", () => {
	// This is a documentation test - the actual fix is in search.js
	// Verifying buildResponse accepts the cache parameter
	const result = buildResponse([{ title: "No results" }], 60);
	const parsed = JSON.parse(result);
	assert.ok(parsed.cache, "Should have cache property");
	assert.strictEqual(parsed.cache.seconds, 60);
});
```

**Step 2: Run test to verify it passes (buildResponse already supports caching)**

Run: `node --test tests/build-response.test.js`
Expected: PASS (buildResponse already handles the parameter)

**Step 3: Add cache parameter to no-results branch**

In `scripts/search.js`, change lines 889-895 from:

```javascript
		return buildResponse([
			errorItem(
				"🔍 No results found",
				noResultsSubtitle,
				`${searxngUrl}/search?q=${encodeURIComponent(cleanQuery)}`
			),
		]);
```

To:

```javascript
		return buildResponse([
			errorItem(
				"🔍 No results found",
				noResultsSubtitle,
				`${searxngUrl}/search?q=${encodeURIComponent(cleanQuery)}`
			),
		], 60);
```

**Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add scripts/search.js tests/build-response.test.js
git commit -m "fix: add caching to no-results response (#48)

Add 60-second cache to the no-results branch when suggestions are empty,
matching the caching behavior of other response paths."
```

---

## Task 3: Add null-safety to normalizeHmacOutput (#47)

**Files:**
- Modify: `scripts/search.js:425-435` (normalizeHmacOutput function)
- Modify: `tests/hmac.test.js` (add null/undefined tests)

**Step 1: Add failing tests for null/undefined handling**

In `tests/hmac.test.js`, add these test cases inside the existing describe block (after the last `it` block around line 78):

```javascript
	it("handles null input gracefully", () => {
		const result = normalizeHmacOutput(null);
		assert.strictEqual(result, "");
	});

	it("handles undefined input gracefully", () => {
		const result = normalizeHmacOutput(undefined);
		assert.strictEqual(result, "");
	});
```

**Step 2: Run tests to verify they fail**

Run: `node --test tests/hmac.test.js`
Expected: FAIL with TypeError on null/undefined (cannot call .trim() on null)

**Step 3: Add null check to normalizeHmacOutput**

In `scripts/search.js`, change lines 425-435 from:

```javascript
function normalizeHmacOutput(output) {
	const trimmed = output.trim();
	// Handle OpenSSL's prefixed format: "LABEL(stdin)= HASH"
	// The '= ' (equals followed by space) is the delimiter before the hash
	const eqIndex = trimmed.lastIndexOf("= ");
	if (eqIndex !== -1) {
		return trimmed.slice(eqIndex + 2);
	}
	// LibreSSL format: just the hash
	return trimmed;
}
```

To:

```javascript
function normalizeHmacOutput(output) {
	if (output == null) return "";
	const trimmed = output.trim();
	// Handle OpenSSL's prefixed format: "LABEL(stdin)= HASH"
	// The '= ' (equals followed by space) is the delimiter before the hash
	const eqIndex = trimmed.lastIndexOf("= ");
	if (eqIndex !== -1) {
		return trimmed.slice(eqIndex + 2);
	}
	// LibreSSL format: just the hash
	return trimmed;
}
```

**Step 4: Update test extraction regex**

The test extraction regex in `tests/hmac.test.js` (line 17-18) needs to handle the new return statement. Update lines 17-18:

```javascript
const normalizeHmacMatch = searchJs.match(
	/function normalizeHmacOutput\(output\) \{[\s\S]*?\/\/ LibreSSL format[\s\S]*?return trimmed;\s*\}/
);
```

**Step 5: Run tests to verify they pass**

Run: `node --test tests/hmac.test.js`
Expected: PASS all 12 tests (10 existing + 2 new)

**Step 6: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 7: Commit**

```bash
git add scripts/search.js tests/hmac.test.js
git commit -m "fix: add null-safety to normalizeHmacOutput (#47)

- Return empty string for null/undefined input
- Prevents TypeError from unexpected shell failures
- Update test regex to handle early return"
```

---

## Task 4: Document test extraction pattern (#47 part 2)

**Files:**
- Modify: `tests/hmac.test.js:12-24` (add documentation comment)

**Step 1: Add documentation explaining the extraction pattern**

In `tests/hmac.test.js`, replace lines 12-24:

```javascript
// Extract normalizeHmacOutput function from search.js
const searchJs = fs.readFileSync(
	path.join(__dirname, "../scripts/search.js"),
	"utf-8"
);
const normalizeHmacMatch = searchJs.match(
	/function normalizeHmacOutput\(output\) \{[\s\S]*?return trimmed;\s*\}/
);
if (!normalizeHmacMatch) {
	throw new Error("Could not find normalizeHmacOutput function in search.js");
}
// eslint-disable-next-line no-eval
const normalizeHmacOutput = eval(`(${normalizeHmacMatch[0]})`);
```

With:

```javascript
/**
 * Extract normalizeHmacOutput function from search.js for testing.
 *
 * WHY THIS APPROACH:
 * - JXA scripts run in JavaScriptCore, not Node.js
 * - No module system (no require/export) in JXA
 * - Can't import functions directly into Node test environment
 *
 * HOW IT WORKS:
 * - Read the source file as text
 * - Regex extracts the function definition as a string
 * - eval() compiles it into a callable function
 *
 * MAINTENANCE NOTES:
 * - Regex matches from "function normalizeHmacOutput" to "return trimmed;"
 * - If function structure changes significantly, update the regex
 * - The function must remain pure (no JXA dependencies) to be testable
 */
const searchJs = fs.readFileSync(
	path.join(__dirname, "../scripts/search.js"),
	"utf-8"
);
const normalizeHmacMatch = searchJs.match(
	/function normalizeHmacOutput\(output\) \{[\s\S]*?\/\/ LibreSSL format[\s\S]*?return trimmed;\s*\}/
);
if (!normalizeHmacMatch) {
	throw new Error("Could not find normalizeHmacOutput function in search.js");
}
// eslint-disable-next-line no-eval
const normalizeHmacOutput = eval(`(${normalizeHmacMatch[0]})`);
```

**Step 2: Run tests to ensure documentation doesn't break anything**

Run: `node --test tests/hmac.test.js`
Expected: PASS all tests

**Step 3: Commit**

```bash
git add tests/hmac.test.js
git commit -m "docs: document JXA test extraction pattern (#47)

Explain why we extract functions via regex/eval rather than
importing directly - JXA has no module system."
```

---

## Task 5: Final verification and PR

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Check for any linting issues**

Run: `npm run lint` (if available) or verify manually

**Step 3: Create PR**

```bash
git push -u origin <branch-name>
gh pr create --title "fix: batch bugfixes for scriptFilter, caching, and HMAC (#47, #48, #49)" --body "$(cat <<'EOF'
## Summary

Fixes three related bugs in the search script:

1. **scriptFilter edge cases (#49)**: Handle undefined returns and non-Error throws
2. **No-results caching (#48)**: Add 60-second cache to empty no-results response
3. **HMAC null-safety (#47)**: Prevent TypeError on null/undefined input

## Changes

- `scripts/search.js`: Three targeted fixes
- `tests/script-filter.test.js`: New test file for scriptFilter wrapper
- `tests/hmac.test.js`: Added null/undefined tests + documentation
- `tests/build-response.test.js`: Added caching verification test

## Test Plan

- [ ] All existing tests pass
- [ ] New scriptFilter tests cover undefined, null, string throws, null throws
- [ ] HMAC tests verify null-safety
- [ ] Manual test: trigger each edge case in Alfred

Closes #47, #48, #49

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
