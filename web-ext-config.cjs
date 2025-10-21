module.exports = {
  verbose: false,
  build: { overwriteDest: true },
  run: {
    startUrl: ["about:debugging"], // Open URLs on start
    // Set the browser setting (like in about:config)
    pref: ["extensions.webextensions.tabhide.enabled=true"],
    firefox: "firefox-nightly", // Change this to use another FF version
  },
};
