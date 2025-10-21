Firefox Addon Page: https://addons.mozilla.org/firefox/addon/bash-bookmarks/

This is a companion extension to https://github.com/artbit/bash-bookmarks

# What it does

It allows you to create and search through an external bookmarks using an external bookmarks manager (https://github.com/artbit/bash-bookmarks)

It registers a new `bb` keyword that allows you to search for bash-bookmarks directly in the address bar.
Example: `bb somesearchkeywords`

The extension will then query the bash-bookmarks server for results matching `somesearchkeywords` and populate them in the address-bar suggestions.

It will also register a listener to whenever you add a new bookmark, and also save it in your bash-bookmarks.

See https://github.com/artbit/bash-bookmarks for more info.

## Development

This add-on now supports both Firefox desktop and Firefox for Android.

### Building the Add-on

Use the provided Makefile for development tasks:

```bash
# Show all available commands
make help

# Lint the add-on
make lint

# Show current version
make version

# Bump version and build
make bump-patch  # 0.0.1 -> 0.0.2
make bump-minor  # 0.0.1 -> 0.1.0
make bump-major  # 0.0.1 -> 1.0.0

# Build the add-on zip file
make build

# Open Mozilla Add-ons page and build artifacts folder
make publish

# Run all: lint, bump patch version, and build
make all

# Clean build artifacts
make clean
```

### Prerequisites

Install web-ext if you haven't already:
```bash
make install
```

### Testing on Firefox Android

See `test-android-compatibility.md` for detailed testing instructions.
