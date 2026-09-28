Firefox Addon Page: https://addons.mozilla.org/firefox/addon/bash-bookmarks/

This is a companion extension to https://github.com/artbit/bash-bookmarks

# What it does

It allows you to create and search through an external bookmarks using an external bookmarks manager (https://github.com/artbit/bash-bookmarks)

It registers a new `bb` keyword that allows you to search for bash-bookmarks directly in the address bar.
Example: `bb somesearchkeywords`

The extension will then query the bash-bookmarks server for results matching `somesearchkeywords` and populate them in the address-bar suggestions.

It will also register a listener to whenever you add a new bookmark, and also save it in your bash-bookmarks.

See https://github.com/artbit/bash-bookmarks for more info.

## Configuring the server

Open the add-on settings (click the toolbar button) and enter the address of your bookmarks server, for example:

- `http://192.168.1.10:9080`, the server directly (9080 is the server's default port)
- `https://bookmarks.example.com`, behind a reverse proxy
- `https://<machine>.<tailnet>.ts.net`, over Tailscale

Both `http://` and `https://` work. When you save, Firefox asks for permission to access that server, and the add-on checks that it can reach it.

If your reverse proxy redirects `http://` to `https://` (for example "Force SSL" in Nginx Proxy Manager), enter the `https://` address. On a redirect Firefox turns the POST that saves a bookmark into a GET and drops its body, so adding bookmarks fails. The add-on detects this and tells you which address to use.

When something fails (server down, untrusted certificate, a page the server cannot reach, a bookmark whose title already exists), the add-on shows a notification and a red `!` badge on its toolbar button. `bb` search errors appear in the address bar suggestions.

### HTTPS with a private CA

Firefox uses its own list of trusted certificate authorities, not the one of your operating system. If your server's certificate is issued by your own CA (a "Home Root CA", for example), the add-on cannot connect until Firefox trusts it:

1. Open Firefox Settings > Privacy & Security > Certificates > View Certificates > Authorities, and click Import.
2. Select your CA certificate (the root, not the server certificate), tick "Trust this CA to identify websites" and confirm.
3. Make sure the server certificate lists the exact hostname you use (for example `bookmarks.home`) in its subjectAltName. Browsers may reject a wildcard like `*.home` that covers a single-label top-level domain.
4. Open the server address in a Firefox tab: it should load without a certificate warning. Clicking through a warning is not enough, the add-on's requests will still fail.

Alternatively, skip HTTPS and use the plain `http://<server-ip>:9080` address on your local network, or use Tailscale, whose `*.ts.net` certificates are publicly trusted.

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
