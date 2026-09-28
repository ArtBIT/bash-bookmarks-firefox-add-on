const input = document.querySelector("#serverURL");
const statusDiv = document.querySelector("#status");

const STATUS_STYLES = {
  success: { backgroundColor: "#d4edda", color: "#155724", border: "1px solid #c3e6cb" },
  error: { backgroundColor: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb" },
  info: { backgroundColor: "#e2e3e5", color: "#383d41", border: "1px solid #d6d8db" },
};

function showStatus(message, type) {
  statusDiv.textContent = message;
  Object.assign(statusDiv.style, STATUS_STYLES[type], { display: "block" });
}

async function requestHostPermission(serverURL) {
  try {
    return await browser.permissions.request({ origins: [serverOriginPattern(serverURL)] });
  } catch (error) {
    // Not supported everywhere (e.g. some Android versions). The server sends
    // CORS headers, so requests still work without the permission.
    console.log("Could not request host permission:", error);
    return false;
  }
}

function saveOptions(e) {
  e.preventDefault();

  let serverURL;
  try {
    serverURL = normalizeServerURL(input.value);
  } catch (error) {
    showStatus(error.message, "error");
    return;
  }

  // permissions.request() only works directly inside the user action, so it
  // has to start before anything is awaited
  const permission = requestHostPermission(serverURL);

  (async () => {
    await permission;
    await browser.storage.sync.set({ serverURL });
    input.value = serverURL;
    showStatus(`Saved. Checking ${serverURL}...`, "info");

    const result = await checkServer(serverURL);
    showStatus(result.ok ? `Settings saved. ${result.message}` : `Settings saved, but: ${result.message}`, result.ok ? "success" : "error");
  })().catch((error) => showStatus(`Could not save settings: ${error.message}`, "error"));
}

async function restoreOptions() {
  try {
    input.value = await getServerURL();
  } catch (error) {
    console.error("Error loading settings:", error);
    input.value = DEFAULT_SERVER_URL;
  }
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
