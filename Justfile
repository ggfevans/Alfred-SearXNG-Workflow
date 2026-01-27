set quiet := true

# REQUIRED: local workflow folder must have the same name as this git repo folder

workflow_uid := `basename "$PWD"`
prefs_location := `defaults read com.runningwithcrayons.Alfred-Preferences syncfolder | sed "s|^~|$HOME|"`
local_workflow := prefs_location / "Alfred.alfredpreferences/workflows" / workflow_uid

#───────────────────────────────────────────────────────────────────────────────

# Sync changes FROM local Alfred workflow to this git repo
transfer-changes-FROM-local:
    #!/usr/bin/env zsh
    rsync --archive --delete --exclude-from="$PWD/.rsync-exclude" "{{ local_workflow }}/" "$PWD"
    git status --short

# Sync changes TO local Alfred workflow from this git repo
transfer-changes-TO-local:
    #!/usr/bin/env zsh
    rsync --archive --delete --exclude-from="$PWD/.rsync-exclude" "$PWD/" "{{ local_workflow }}"
    cd "{{ local_workflow }}"
    print "\e[1;34mChanges at the local workflow:\e[0m"
    git status --short .

# Open workflow in Alfred Preferences for visual editing
[macos]
open-local-workflow-in-alfred:
    #!/usr/bin/env zsh
    open "alfredpreferences://navigateto/workflows>workflow>{{ workflow_uid }}"
    osascript -e 'tell application id "com.runningwithcrayons.Alfred" to reveal workflow "{{ workflow_uid }}"'

# Run the release process
release:
    ./.build-and-release.sh
