// Put all the javascript code here, that you want to execute in background.

// Provide help text to the user.
browser.omnibox.setDefaultSuggestion({
  description: `Search the bash-bookmarks 
    (e.g. "sometitle" | "sometags")`,
});

function createSuggestionsFromResponse(response) {
  return new Promise((resolve) => {
    let suggestions = [];
    let suggestionsOnEmptyResults = [
      {
        content: "",
        description: "no results found",
      },
    ];
    response.json().then((results) => {
      if (!results.length) {
        return resolve(suggestionsOnEmptyResults);
      }

      results.forEach(({ title: description, url: content }) => {
        suggestions.push({
          content,
          description,
        });
      });
      return resolve(suggestions);
    });
  });
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

browser.bookmarks.onCreated.addListener(
  async (id, { title, url, parentId }) => {
    // add post params
    let format = "json";
    let res = await browser.storage.sync.get("serverURL");
    let requestUrl = `${res.serverURL}/add`;

    let category = "unsorted";
    if (parentId) {
      const res = await browser.bookmarks.get(parentId);
      category = res[0].title;
    }
    let data = {
      title,
      url,
      category,
    };
    let headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    let body = JSON.stringify(data);
    let request = new Request(requestUrl, { method: "POST", headers, body });

    fetch(request)
      .then((response) => response.json())
      .then((response) => {
        if (response.success) {
          console.log("Bookmark added!");
          // show a small notification
          try {
            browser.notifications.create({
              type: "basic",
              iconUrl: browser.runtime.getURL("icons/icon48.png"),
              title: "Bookmark Added",
              message: `Title: ${title}\nURL: ${url}`,
            });
          } catch (error) {
            // Fallback for Android or if notifications are not supported
            console.log("Notification not supported or failed:", error);
          }
        } else {
          console.log("Bookmark not added!");
        }
      });
  }
);

browser.omnibox.onInputChanged.addListener(async (text, addSuggestions) => {
  let headers = new Headers({ Accept: "application/json" });
  let init = { method: "GET", headers };
  let format = "json";
  let res = await browser.storage.sync.get("serverURL");
  let requestUrl = `${res.serverURL}/search?format=${format}&q=${text}`;
  let request = new Request(requestUrl, init);

  fetch(request).then(createSuggestionsFromResponse).then(addSuggestions);
});

// Open the page based on how the user clicks on a suggestion.
browser.omnibox.onInputEntered.addListener((text, disposition) => {
  let url = text;
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
