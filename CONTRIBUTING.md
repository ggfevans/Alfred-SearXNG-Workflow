# Contributing

## Development Setup

### Requirements

- macOS with [Alfred 5+](https://www.alfredapp.com/) and Powerpack
- [Just](https://github.com/casey/just) command runner
- Node.js 18+

### Initial Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and set your `WORKFLOW_UID`:
   ```bash
   cp .env.example .env
   ```
3. Find your workflow UID in `~/Library/Application Support/Alfred/Alfred.alfredpreferences/workflows/` and update `.env`

## Development Workflow

This project uses [Just](https://github.com/casey/just) for development tasks. Run `just` to see available commands.

### Syncing Changes

The workflow code lives in two places: the git repository and Alfred's workflow folder. Use these commands to sync:

```bash
# Pull changes FROM Alfred workflow TO git repo
just transfer-changes-FROM-local

# Push changes FROM git repo TO Alfred workflow
just transfer-changes-TO-local
```

**Typical workflow:**
1. Edit the workflow in Alfred Preferences (visual editing)
2. Run `just transfer-changes-FROM-local` to sync changes to the git repo
3. Commit and push changes

Or:
1. Edit files in the git repo (code editing)
2. Run `just transfer-changes-TO-local` to sync to Alfred
3. Test in Alfred

### Opening the Workflow

```bash
# Open workflow in Alfred Preferences
just open-local-workflow-in-alfred

# Show the local workflow path
just show-workflow-path
```

### Testing

```bash
npm test
```

Tests are located in the `tests/` directory.

## Release Process

Releases are automated via GitHub Actions when a version tag is pushed.

```bash
# Run the release script (prompts for version, updates plists, commits, tags, pushes)
just release
```

The release script:
1. Prompts for the next version number
2. Updates `info.plist` in both the repo and local workflow
3. Generates changelog from commits since last release
4. Creates a commit with message `release: X.Y.Z`
5. Pushes the commit and creates a git tag
6. Opens Alfred Gallery update submission form

The GitHub Action will then:
- Build the `.alfredworkflow` file
- Create a GitHub release
- Attach the workflow file to the release

### Version Updates

Version numbers are managed via `info.plist`. The `npm version` command is hooked via `postversion` script to sync versions.

## Code Style

This project uses `.editorconfig` for consistent formatting. Most editors support it automatically or via plugin.

## File Exclusions

`.rsync-exclude` controls which files are synced between the repo and Alfred workflow. Development files (README, tests, build scripts) are excluded from the Alfred workflow.
