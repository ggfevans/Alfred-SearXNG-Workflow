# Alfred-SearXNG-Workflow

![GitHub downloads](https://img.shields.io/github/downloads/gvns/Alfred-SearXNG-Workflow/total?label=GitHub%20Downloads&style=plastic&logo=github)
![Latest release](https://img.shields.io/github/v/release/gvns/Alfred-SearXNG-Workflow?label=Latest%20Release&style=plastic)

Search your personal [SearXNG](https://docs.searxng.org/) instance directly from Alfred with inline results.

## Features

- Inline search results displayed directly in Alfred
- Autocomplete suggestions as you type
- Quick Look preview with <kbd>⇧</kbd>
- Copy URL with <kbd>⌘</kbd>+<kbd>C</kbd>
- Fallback to browser search if API is unavailable

## Usage

- Type `sx` followed by your search query
- <kbd>⏎</kbd> Open result in browser
- <kbd>⌘</kbd>+<kbd>⏎</kbd> Copy URL to clipboard
- <kbd>⌥</kbd>+<kbd>⏎</kbd> Open in SearXNG web interface
- <kbd>⇧</kbd> Quick Look preview

## Installation

1. [Download the latest release](https://github.com/gvns/Alfred-SearXNG-Workflow/releases/latest)
2. Double-click the `.alfredworkflow` file to install
3. Configure your SearXNG URL in the workflow settings

## Configuration

| Setting | Description |
|---------|-------------|
| `searxng_url` | Your SearXNG instance URL (e.g., `https://search.example.com`) |
| `timeout_ms` | Request timeout in milliseconds (default: 5000) |

## Requirements

- Alfred 5+ with Powerpack
- A SearXNG instance with JSON format enabled

### SearXNG Configuration

Your SearXNG instance must have JSON format enabled in `settings.yml`:

```yaml
search:
  formats:
    - html
    - json
  autocomplete: 'duckduckgo'  # or another backend
```

## Development

This workflow uses [just](https://github.com/casey/just) for development tasks:

```bash
# Install just
brew install just

# Sync changes from Alfred to git repo
just transfer-changes-FROM-local

# Sync changes from git repo to Alfred
just transfer-changes-TO-local

# Open workflow in Alfred Preferences
just open-local-workflow-in-alfred

# Create a release
just release
```

**Important:** The git repo folder name must match the Alfred workflow folder name for sync to work.

## License

MIT License - see [LICENSE](LICENSE) for details.
