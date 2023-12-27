async function saveOptions(e) {
  e.preventDefault();
  // remove trailing slash
  await browser.storage.sync.set({
    serverURL: document.querySelector("#serverURL").value.replace(/\/$/, ""),
  });
}

async function restoreOptions() {
  let res = await browser.storage.sync.get("serverURL");
  document.querySelector("#serverURL").value =
    res.serverURL || "http://localhost:8000";
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
