# Changelog

All notable changes to this project are documented in this file.

## [0.1.0] - 2026-01-27

### Added
- Fallback Search trigger for default web search replacement
- Website favicons displayed for search results
- Unit tests for shellEscape function

### Fixed
- Corrected version to 0.1.0
- Removed broken awk command from HMAC computation
- Validated timeout_ms configuration
- Prevented shell injection in curl command

### Changed
- Updated README with current features

### Chore
- Added postversion hook to sync versions

## [Pre-release] - Development

### Added
- SearXNG search workflow implementation
- Project roadmap documentation

### Changed
- Removed search.js
- Updated Justfile with path logic for .env

### Documentation
- Added CLAUDE.md with development conventions
- Added reference documentation for implementation
- Added initial design document for Alfred-SearXNG workflow

