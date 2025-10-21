async function saveOptions(e) {
  e.preventDefault();
  
  const serverURL = document.querySelector("#serverURL").value.replace(/\/$/, "");
  const statusDiv = document.querySelector("#status");
  
  try {
    // Validate URL format
    new URL(serverURL);
    
    await browser.storage.sync.set({
      serverURL: serverURL,
    });
    
    // Show success message
    statusDiv.textContent = "Settings saved successfully!";
    statusDiv.style.backgroundColor = "#d4edda";
    statusDiv.style.color = "#155724";
    statusDiv.style.border = "1px solid #c3e6cb";
    statusDiv.style.display = "block";
    
    // Hide status after 3 seconds
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 3000);
    
  } catch (error) {
    // Show error message
    statusDiv.textContent = "Please enter a valid URL (e.g., http://your-server:8000)";
    statusDiv.style.backgroundColor = "#f8d7da";
    statusDiv.style.color = "#721c24";
    statusDiv.style.border = "1px solid #f5c6cb";
    statusDiv.style.display = "block";
  }
}

async function restoreOptions() {
  try {
    let res = await browser.storage.sync.get("serverURL");
    document.querySelector("#serverURL").value =
      res.serverURL || "http://localhost:8000";
  } catch (error) {
    console.error("Error loading settings:", error);
    document.querySelector("#serverURL").value = "http://localhost:8000";
  }
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
