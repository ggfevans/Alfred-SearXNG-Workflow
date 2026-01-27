#!/usr/bin/env node
/**
 * Unit tests for parseTimeout function
 * Run with: node tests/parse-timeout.test.js
 */

const assert = require("node:assert");
const { describe, it } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

// Extract parseTimeout function from search.js
const searchJs = fs.readFileSync(
	path.join(__dirname, "../scripts/search.js"),
	"utf-8"
);
const parseTimeoutMatch = searchJs.match(
	/function parseTimeout\(value, defaultMs = 5000, maxMs = 30000\) \{[\s\S]*?return Math\.min\(parsed, maxMs\);\s*\}/
);
if (!parseTimeoutMatch) {
	throw new Error("Could not find parseTimeout function in search.js");
}
// eslint-disable-next-line no-eval
const parseTimeout = eval(`(${parseTimeoutMatch[0]})`);

describe("parseTimeout", () => {
	describe("valid input", () => {
		it("parses valid numeric string", () => {
			assert.strictEqual(parseTimeout("5000"), 5000);
		});

		it("parses small valid value", () => {
			assert.strictEqual(parseTimeout("1000"), 1000);
		});

		it("parses value at max boundary", () => {
			assert.strictEqual(parseTimeout("30000"), 30000);
		});
	});

	describe("clamping", () => {
		it("clamps value exceeding default max", () => {
			assert.strictEqual(parseTimeout("60000"), 30000);
		});

		it("clamps to custom max when provided", () => {
			assert.strictEqual(parseTimeout("15000", 5000, 10000), 10000);
		});

		it("accepts value at custom max", () => {
			assert.strictEqual(parseTimeout("10000", 5000, 10000), 10000);
		});
	});

	describe("invalid input - returns default", () => {
		it("returns default for NaN string", () => {
			assert.strictEqual(parseTimeout("abc"), 5000);
		});

		it("returns default for empty string", () => {
			assert.strictEqual(parseTimeout(""), 5000);
		});

		it("returns default for zero", () => {
			assert.strictEqual(parseTimeout("0"), 5000);
		});

		it("returns default for negative value", () => {
			assert.strictEqual(parseTimeout("-1000"), 5000);
		});

		it("returns default for whitespace", () => {
			assert.strictEqual(parseTimeout("   "), 5000);
		});

		it("returns default for special characters", () => {
			assert.strictEqual(parseTimeout("$VAR"), 5000);
		});
	});

	describe("parseInt truncation behavior", () => {
		it("truncates floating point string to integer", () => {
			// parseInt stops at decimal point, so "5.5" becomes 5
			assert.strictEqual(parseTimeout("5.5"), 5);
		});

		it("parses leading numeric portion of mixed string", () => {
			// parseInt("10abc") returns 10 (parses until non-digit)
			assert.strictEqual(parseTimeout("10abc"), 10);
		});
	});

	describe("custom defaults", () => {
		it("uses custom default for invalid input", () => {
			assert.strictEqual(parseTimeout("invalid", 10000), 10000);
		});

		it("uses custom default for zero", () => {
			assert.strictEqual(parseTimeout("0", 7500), 7500);
		});

		it("uses custom default for negative", () => {
			assert.strictEqual(parseTimeout("-100", 8000), 8000);
		});
	});

	describe("edge cases", () => {
		it("handles value of 1 (minimum valid)", () => {
			assert.strictEqual(parseTimeout("1"), 1);
		});

		it("handles large valid value within max", () => {
			assert.strictEqual(parseTimeout("29999"), 29999);
		});

		it("handles null-like string", () => {
			assert.strictEqual(parseTimeout("null"), 5000);
		});

		it("handles undefined-like string", () => {
			assert.strictEqual(parseTimeout("undefined"), 5000);
		});
	});
});
