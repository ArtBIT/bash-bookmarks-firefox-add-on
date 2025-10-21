// Put all the javascript code here, that you want to execute in background.

console.log("Bash-Bookmarks extension loaded");

// Check available permissions
browser.permissions.getAll().then(permissions => {
  console.log("Available permissions:", permissions);
}).catch(error => {
  console.log("Error checking permissions:", error);
});

// Provide help text to the user (desktop only)
if (browser.omnibox && browser.omnibox.setDefaultSuggestion) {
  browser.omnibox.setDefaultSuggestion({
    description: `Search the bash-bookmarks 
      (e.g. "sometitle" | "sometags")`,
  });
}

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

// Function to process bookmark data with Android optimizations
async function processBookmark(bookmarkInfo, eventType) {
  console.log(`Bookmark ${eventType} event fired:`, bookmarkInfo);
  
  try {
    
    // Extract bookmark data
    const { title, url, parentId } = bookmarkInfo;
    
    // Validate required data
    if (!title || !url) {
      console.log("Invalid bookmark data:", { title, url });
      return;
    }
    
    console.log("Processing bookmark:", { title, url, parentId, eventType });
    
    // Get server URL from storage
    let res = await browser.storage.sync.get("serverURL");
    if (!res.serverURL) {
      console.log("No server URL configured");
      return;
    }
    
    let requestUrl = `${res.serverURL}/add`;
    console.log("Sending to server:", requestUrl);

    let category = "unsorted";
    // Parent category detection removed - not supported on Android
    
    let data = {
      title,
      url,
      category,
    };
    
    console.log("Sending data:", data);
    
    // Android-optimized request with timeout and retry
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    let headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    let body = JSON.stringify(data);
    let request = new Request(requestUrl, { 
      method: "POST", 
      headers, 
      body,
      signal: controller.signal
    });

    fetch(request)
      .then((response) => {
        clearTimeout(timeoutId);
        console.log("Server response status:", response.status);
        return response.json();
      })
      .then((response) => {
        console.log("Server response:", response);
        if (response.success) {
          console.log("Bookmark added successfully!");
          // Show notification with Android-friendly settings
          try {
            browser.notifications.create({
              type: "basic",
              iconUrl: browser.runtime.getURL("icons/icon48.png"),
              title: "Bookmark Added",
              message: `Title: ${title}`,
              priority: 1 // Higher priority for Android
            });
          } catch (error) {
            // Fallback for Android or if notifications are not supported
            console.log("Notification not supported or failed:", error);
          }
        } else {
          console.log("Bookmark not added - server returned success: false");
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.log("Error sending bookmark to server:", error);
        
        // Retry once after a delay for Android
        if (error.name === 'AbortError') {
          console.log("Request timed out, retrying in 2 seconds...");
          setTimeout(() => {
            processBookmark(bookmarkInfo, eventType + "_retry");
          }, 2000);
        }
      });
  } catch (error) {
    console.log("Error in bookmark listener:", error);
  }
}

// Check if bookmarks API is available
if (browser.bookmarks) {
  console.log("Bookmarks API is available - setting up listeners");
  
  // Listen for bookmark creation
  browser.bookmarks.onCreated.addListener(
    async (id, bookmarkInfo) => {
      console.log("Bookmark created:", bookmarkInfo);
      await processBookmark(bookmarkInfo, "created");
    }
  );
  
  console.log("Bookmark listener registered successfully");
} else {
  console.log("Bookmarks API is not available - extension will not process bookmarks");
}


// Omnibox functionality (desktop only)
if (browser.omnibox) {
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
}

// Confirm listeners are registered
console.log("All listeners registered successfully");
