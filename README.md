Firefox Addon Page: https://addons.mozilla.org/en-US/firefox/addon/bash-bookmarks/

This is a companion extension to https://github.com/artbit/bash-bookmarks

# What it does

It allows you to create and search through an external bookmarks using an external bookmarks manager (https://github.com/artbit/bash-bookmarks)

It registers a new `bb` keyword that allows you to search for bash-bookmarks directly in the address bar.
Example: `bb somesearchkeywords`

The extension will then query the bash-bookmarks server for results matching `somesearchkeywords` and populate them in the address-bar suggestions.

It will also register a listener to whenever you add a new bookmark, and also save it in your bash-bookmarks.

See https://github.com/artbit/bash-bookmarks for more info.
