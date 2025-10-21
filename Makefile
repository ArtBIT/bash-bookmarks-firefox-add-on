# Makefile for Bash-Bookmarks Firefox Add-on
# This Makefile handles linting, version bumping, and building the add-on

# Variables
ADDON_NAME := bash-bookmarks
VERSION_FILE := manifest.json
BUILD_DIR := web-ext-artifacts
PACKAGE_NAME := $(ADDON_NAME)-$(shell grep '"version"' $(VERSION_FILE) | sed 's/.*"version": *"\([^"]*\)".*/\1/')

# Default target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  lint        - Lint the add-on using web-ext"
	@echo "  version     - Show current version"
	@echo "  bump-patch  - Bump patch version (0.0.1 -> 0.0.2)"
	@echo "  bump-minor  - Bump minor version (0.0.1 -> 0.1.0)"
	@echo "  bump-major  - Bump major version (0.0.1 -> 1.0.0)"
	@echo "  build       - Build the add-on zip file"
	@echo "  clean       - Clean build artifacts"
	@echo "  all         - Lint, bump patch version, and build"
	@echo "  install     - Install web-ext if not present"

# Check if web-ext is installed
.PHONY: check-web-ext
check-web-ext:
	@which web-ext > /dev/null || (echo "web-ext not found. Run 'make install' to install it." && exit 1)

# Install web-ext
.PHONY: install
install:
	@echo "Installing web-ext..."
	npm install -g web-ext
	@echo "web-ext installed successfully!"

# Lint the add-on
.PHONY: lint
lint: check-web-ext
	@echo "Linting add-on..."
	web-ext lint --config web-ext-config.js
	@echo "Linting completed!"

# Show current version
.PHONY: version
version:
	@echo "Current version: $(shell grep '"version"' $(VERSION_FILE) | sed 's/.*"version": *"\([^"]*\)".*/\1/')"

# Bump patch version (0.0.1 -> 0.0.2)
.PHONY: bump-patch
bump-patch:
	@echo "Bumping patch version..."
	@current_version=$$(grep '"version"' $(VERSION_FILE) | sed 's/.*"version": *"\([^"]*\)".*/\1/'); \
	major_minor=$$(echo $$current_version | cut -d. -f1-2); \
	patch=$$(echo $$current_version | cut -d. -f3); \
	new_patch=$$((patch + 1)); \
	new_version="$$major_minor.$$new_patch"; \
	sed -i "s/\"version\": \"$$current_version\"/\"version\": \"$$new_version\"/" $(VERSION_FILE); \
	echo "Version bumped from $$current_version to $$new_version"

# Bump minor version (0.0.1 -> 0.1.0)
.PHONY: bump-minor
bump-minor:
	@echo "Bumping minor version..."
	@current_version=$$(grep '"version"' $(VERSION_FILE) | sed 's/.*"version": *"\([^"]*\)".*/\1/'); \
	major=$$(echo $$current_version | cut -d. -f1); \
	minor=$$(echo $$current_version | cut -d. -f2); \
	new_minor=$$((minor + 1)); \
	new_version="$$major.$$new_minor.0"; \
	sed -i "s/\"version\": \"$$current_version\"/\"version\": \"$$new_version\"/" $(VERSION_FILE); \
	echo "Version bumped from $$current_version to $$new_version"

# Bump major version (0.0.1 -> 1.0.0)
.PHONY: bump-major
bump-major:
	@echo "Bumping major version..."
	@current_version=$$(grep '"version"' $(VERSION_FILE) | sed 's/.*"version": *"\([^"]*\)".*/\1/'); \
	major=$$(echo $$current_version | cut -d. -f1); \
	new_major=$$((major + 1)); \
	new_version="$$new_major.0.0"; \
	sed -i "s/\"version\": \"$$current_version\"/\"version\": \"$$new_version\"/" $(VERSION_FILE); \
	echo "Version bumped from $$current_version to $$new_version"

# Build the add-on
.PHONY: build
build: check-web-ext
	@echo "Building add-on..."
	@mkdir -p $(BUILD_DIR)
	web-ext build --config web-ext-config.js --artifacts-dir $(BUILD_DIR)
	@echo "Build completed! Artifacts in $(BUILD_DIR)/"

# Clean build artifacts
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	rm -rf $(BUILD_DIR)
	@echo "Clean completed!"

# Run all: lint, bump patch version, and build
.PHONY: all
all: lint bump-patch build
	@echo "All tasks completed successfully!"

# Development workflow: lint and build without version bump
.PHONY: dev
dev: lint build
	@echo "Development build completed!"

# Show build info
.PHONY: info
info:
	@echo "Add-on: $(ADDON_NAME)"
	@echo "Version: $(shell grep '"version"' $(VERSION_FILE) | sed 's/.*"version": *"\([^"]*\)".*/\1/')"
	@echo "Package name: $(PACKAGE_NAME)"
	@echo "Build directory: $(BUILD_DIR)"
