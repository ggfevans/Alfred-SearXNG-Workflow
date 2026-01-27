#!/usr/bin/env osascript -l JavaScript

// Alfred-SearXNG-Workflow: Search Script
// See docs/reference/jxa-patterns-from-gitfred.md for implementation patterns

// ============================================================================
// IMPORTS AND INITIALIZATION
// ============================================================================

ObjC.import("stdlib");

const app = Application.currentApplication();
app.includeStandardAdditions = true;

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Read workflow configuration from Alfred environment variables
 */
function getConfig() {
	const searxngUrl = $.getenv("searxng_url")?.trim();
	const timeoutMs = Number.parseInt($.getenv("timeout_ms") || "5000");

	return {
		searxngUrl,
		timeoutMs,
	};
}

// ============================================================================
// HTTP UTILITIES
// ============================================================================

/**
 * Perform HTTP GET request using curl
 * @param {string} url - URL to fetch
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {string|null} Response body or null on error
 */
function httpGet(url, timeoutMs) {
	const timeoutSec = Math.ceil(timeoutMs / 1000);
	const cmd = `curl --silent --location --max-time ${timeoutSec} "${url}" || true`;
	try {
		const response = app.doShellScript(cmd);
		return response || null;
	} catch (e) {
		console.log(`HTTP error: ${e}`);
		return null;
	}
}

// ============================================================================
// DOMAIN EXTRACTION
// ============================================================================

/**
 * Extract domain from URL for display
 * @param {string} url - Full URL
 * @returns {string} Domain without www prefix
 */
function extractDomain(url) {
	try {
		// Use regex since URL constructor not available in JXA
		const match = url.match(/^https?:\/\/(?:www\.)?([^\/]+)/);
		return match ? match[1] : url;
	} catch {
		return url;
	}
}

// ============================================================================
// ALFRED UTILITIES
// ============================================================================

/**
 * Generate enhanced match string for Alfred filtering
 * @param {string} str - String to create match variants for
 * @returns {string} Space-separated match terms
 */
function alfredMatcher(str) {
	const clean = str.replace(/[-()_.:#/\\;,[\]]/g, " ");
	const camelCaseSeparated = str.replace(/([A-Z])/g, " $1");
	return [clean, camelCaseSeparated, str].join(" ");
}

/**
 * Create an error item for Alfred display
 * @param {string} title - Error title
 * @param {string} subtitle - Error description
 * @param {string} [arg] - Optional URL to open on Enter
 * @returns {object} Alfred item
 */
function errorItem(title, subtitle, arg) {
	return {
		title,
		subtitle,
		valid: !!arg,
		arg: arg || "",
		mods: {
			cmd: { valid: false, subtitle: "" },
			alt: { valid: false, subtitle: "" },
			ctrl: { valid: false, subtitle: "" },
			shift: { valid: false, subtitle: "" },
		},
	};
}

// ============================================================================
// SEARXNG API
// ============================================================================

/**
 * Fetch autocomplete suggestions from SearXNG
 * @param {string} baseUrl - SearXNG instance URL
 * @param {string} query - Search query
 * @param {number} timeoutMs - Timeout
 * @returns {string[]} Array of suggestions
 */
function fetchAutocomplete(baseUrl, query, timeoutMs) {
	const url = `${baseUrl}/autocompleter?q=${encodeURIComponent(query)}`;
	const response = httpGet(url, timeoutMs);
	if (!response) return [];

	try {
		const data = JSON.parse(response);
		// Response format: [query, [suggestions...]]
		return Array.isArray(data) && data.length > 1 ? data[1] : [];
	} catch {
		return [];
	}
}

/**
 * Fetch search results from SearXNG
 * @param {string} baseUrl - SearXNG instance URL
 * @param {string} query - Search query
 * @param {number} timeoutMs - Timeout
 * @returns {object|null} Search results or null on error
 */
function fetchSearch(baseUrl, query, timeoutMs) {
	const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&format=json`;
	const response = httpGet(url, timeoutMs);
	if (!response) return null;

	try {
		return JSON.parse(response);
	} catch {
		return null;
	}
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Alfred calls this function automatically
 * @param {string[]} argv - Command line arguments from Alfred
 * @returns {string} JSON string for Alfred Script Filter
 */
// biome-ignore lint/correctness/noUnusedVariables: Alfred run
function run(argv) {
	const query = argv[0]?.trim() || "";
	const config = getConfig();

	// GUARD: Missing configuration
	if (!config.searxngUrl) {
		return JSON.stringify({
			items: [errorItem(
				"SearXNG URL not configured",
				"Set searxng_url in workflow settings"
			)],
		});
	}

	// GUARD: Empty query - show placeholder
	if (!query) {
		return JSON.stringify({
			items: [{
				title: "Search SearXNG...",
				subtitle: `Type to search ${config.searxngUrl}`,
				valid: false,
			}],
		});
	}

	// TODO: Implement autocomplete vs full search logic
	// TODO: Implement network connectivity check
	// TODO: Implement retry logic

	// Fetch search results
	const results = fetchSearch(config.searxngUrl, query, config.timeoutMs);

	// GUARD: No response (network error)
	if (!results) {
		const fallbackUrl = `${config.searxngUrl}/search?q=${encodeURIComponent(query)}`;
		return JSON.stringify({
			items: [
				errorItem(
					"Cannot reach SearXNG",
					"Check your connection or try in browser",
					fallbackUrl
				),
				{
					title: `Search "${query}" in browser`,
					subtitle: "Open SearXNG web interface",
					arg: fallbackUrl,
				},
			],
		});
	}

	// GUARD: API error
	if (results.error || results.message) {
		return JSON.stringify({
			items: [errorItem(
				"SearXNG error",
				results.error || results.message
			)],
		});
	}

	// Format results as Alfred items
	const items = (results.results || []).slice(0, 10).map(result => ({
		title: result.title || "Untitled",
		subtitle: `${extractDomain(result.url)} · ${result.content || ""}`.slice(0, 100),
		arg: result.url,
		quicklookurl: result.url,
		match: alfredMatcher(result.title || ""),
		mods: {
			cmd: {
				arg: result.url,
				subtitle: "⌘: Copy URL",
				variables: { action: "copy" },
			},
			alt: {
				arg: `${config.searxngUrl}/search?q=${encodeURIComponent(query)}`,
				subtitle: "⌥: View in SearXNG",
			},
		},
	}));

	// GUARD: No results
	if (items.length === 0) {
		items.push(errorItem(
			`No results for "${query}"`,
			"Try different search terms"
		));
	}

	// Always add fallback "search in browser" item
	const fallbackUrl = `${config.searxngUrl}/search?q=${encodeURIComponent(query)}`;
	items.push({
		title: `Search "${query}" in browser`,
		subtitle: "Open SearXNG web interface",
		arg: fallbackUrl,
		icon: { path: "icon.png" },
	});

	return JSON.stringify({
		items,
		cache: { seconds: 60, loosereload: true },
	});
}
