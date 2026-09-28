// Background script: sends new Firefox bookmarks to the bookmarks server and
// provides the "bb" omnibox search. The server API client lives in api.js.

console.log("Bash-Bookmarks extension loaded");

// Provide help text to the user (desktop only)
if (browser.omnibox && browser.omnibox.setDefaultSuggestion) {
  browser.omnibox.setDefaultSuggestion({
    description: `Search the bash-bookmarks
      (e.g. "sometitle" | "sometags")`,
  });
}

// Badge support differs between desktop and Android, so failures are ignored
function setErrorBadge(hasError) {
  try {
    browser.browserAction.setBadgeText({ text: hasError ? "!" : "" });
    if (hasError) {
      browser.browserAction.setBadgeBackgroundColor({ color: "#d70022" });
    }
  } catch (error) {
    console.log("Badge not supported:", error);
  }
}

function notify(title, message) {
  try {
    browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("icons/icon48.png"),
      title,
      message,
      priority: 1, // Higher priority for Android
    });
  } catch (error) {
    // Fallback for Android or if notifications are not supported
    console.log("Notification not supported or failed:", error);
  }
}

function reportError(title, error) {
  console.log(`${title}:`, error);
  setErrorBadge(true);
  notify(title, error.message || String(error));
}

browser.browserAction.onClicked.addListener(() => {
  // Check if we're on Android and handle accordingly
  if (browser.runtime.getPlatformInfo) {
    browser.runtime.getPlatformInfo().then((platformInfo) => {
      if (platformInfo.os === 'android') {
        // On Android, open options in a new tab
        browser.tabs.create({ url: browser.runtime.getURL('options.html') });
      } else {
        // On desktop, use the standard options page
        browser.runtime.openOptionsPage();
      }
    });
  } else {
    // Fallback for older versions
    browser.runtime.openOptionsPage();
  }
});

async function processBookmark(bookmarkInfo) {
  const { title, url } = bookmarkInfo;

  // Folders and separators have no url
  if (!url) {
    return;
  }
  if (!/^https?:/i.test(url)) {
    console.log("Skipping bookmark that is not a web page:", url);
    return;
  }

  // Parent category detection removed - not supported on Android
  const data = { url, title: title || "", category: "unsorted", tags: "" };

  try {
    const serverURL = await getServerURL();
    console.log("Sending bookmark to", serverURL, data);
    const result = await addBookmark(serverURL, data);
    console.log("Server response:", result);
    setErrorBadge(false);
    notify("Bookmark Added", `Title: ${result.title || title}`);
  } catch (error) {
    reportError("Bookmark not saved to Bash-Bookmarks", error);
  }
}

// Check if bookmarks API is available
if (browser.bookmarks) {
  browser.bookmarks.onCreated.addListener((id, bookmarkInfo) => {
    console.log("Bookmark created:", bookmarkInfo);
    return processBookmark(bookmarkInfo);
  });
} else {
  console.log("Bookmarks API is not available - extension will not process bookmarks");
}

function isWebURL(text) {
  try {
    return ["http:", "https:"].includes(new URL(text).protocol);
  } catch (error) {
    return false;
  }
}

// Omnibox functionality (desktop only)
if (browser.omnibox) {
  browser.omnibox.onInputChanged.addListener(async (text, addSuggestions) => {
    const query = text.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      addSuggestions([{ content: query, description: `Type at least ${MIN_QUERY_LENGTH} characters to search` }]);
      return;
    }

    let serverURL = DEFAULT_SERVER_URL;
    try {
      serverURL = await getServerURL();
      const results = await searchBookmarks(serverURL, query);
      setErrorBadge(false);
      if (!results.length) {
        addSuggestions([{ content: query, description: "no results found" }]);
        return;
      }
      addSuggestions(results.map(({ title, url }) => ({
        content: url,
        description: title || url,
      })));
    } catch (error) {
      console.log("Search failed:", error);
      setErrorBadge(true);
      addSuggestions([{
        content: `${serverURL}/`,
        description: `Bash-Bookmarks error: ${error.message}`,
      }]);
    }
  });

  // Open the page based on how the user clicks on a suggestion.
  browser.omnibox.onInputEntered.addListener(async (text, disposition) => {
    let url = text;
    if (!isWebURL(text)) {
      // Plain query entered without picking a suggestion: show the server's search results page
      const serverURL = await getServerURL();
      const searchURL = new URL(`${serverURL}/search`);
      searchURL.searchParams.set("q", text.trim());
      searchURL.searchParams.set("format", "html");
      url = searchURL.href;
    }
    switch (disposition) {
      case "currentTab":
        browser.tabs.update({ url });
        break;
      case "newForegroundTab":
        browser.tabs.create({ url });
        break;
      case "newBackgroundTab":
        browser.tabs.create({ url, active: false });
        break;
    }
  });
}
