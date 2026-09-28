// Client for the bookmarks server API, shared by the background script and the options page.

const DEFAULT_SERVER_URL = "http://localhost:9080";
const REQUEST_TIMEOUT_MS = 10000;
const MIN_QUERY_LENGTH = 3;

class ServerError extends Error {}

// Accepts http:// and https:// URLs, keeps a path prefix (for servers behind a
// reverse proxy sub-path) and drops the query, hash and trailing slashes.
function normalizeServerURL(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch (error) {
    throw new ServerError("Please enter a valid URL, e.g. http://192.168.1.10:9080 or https://bookmarks.example.com");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ServerError("The server URL must start with http:// or https://");
  }
  return (url.origin + url.pathname).replace(/\/+$/, "");
}

// Match pattern for the host permission covering the server (match patterns ignore the port)
function serverOriginPattern(serverURL) {
  const url = new URL(serverURL);
  return `${url.protocol}//${url.hostname}/*`;
}

async function getServerURL() {
  const { serverURL } = await browser.storage.sync.get("serverURL");
  if (!serverURL) {
    return DEFAULT_SERVER_URL;
  }
  return normalizeServerURL(serverURL);
}

function connectionErrorMessage(serverURL) {
  let message = `Could not connect to ${serverURL}. Check that the server is running and the URL in the add-on settings is correct.`;
  if (serverURL.startsWith("https://")) {
    message += " If the server uses a certificate from a private CA, import that CA into Firefox (see the add-on README) or use http://<server-ip>:9080 instead.";
  }
  return message;
}

function redirectErrorMessage(serverURL, redirectedTo) {
  const target = new URL(redirectedTo);
  return `${serverURL} redirects to ${target.origin}, and Firefox drops the body of a redirected POST. Set the server URL to ${target.origin} in the add-on settings.`;
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// A plain GET is not affected by an http -> https redirect, so it tells a
// redirect apart from a server that is down or has an untrusted certificate.
async function findRedirect(serverURL) {
  try {
    const response = await fetchWithTimeout(`${serverURL}/search?format=json&q=`, {
      headers: { Accept: "application/json" },
    });
    return response.redirected ? response.url : null;
  } catch (error) {
    return null;
  }
}

// Sends a request and returns the parsed JSON body. Throws a ServerError with
// a message meant for the user when the request fails for any reason,
// including an {"error": ...} body sent with HTTP 200.
async function apiRequest(serverURL, path, { method = "GET", params, body } = {}) {
  const url = new URL(serverURL + path);
  if (params) {
    // searchParams encodes each value exactly once
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const headers = { Accept: "application/json" };
  const init = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetchWithTimeout(url, init);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ServerError(`${serverURL} did not respond within ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
    }
    const redirectedTo = method !== "GET" && (await findRedirect(serverURL));
    if (redirectedTo) {
      throw new ServerError(redirectErrorMessage(serverURL, redirectedTo));
    }
    throw new ServerError(connectionErrorMessage(serverURL));
  }

  if (response.redirected && method !== "GET") {
    throw new ServerError(redirectErrorMessage(serverURL, response.url));
  }

  const requestLabel = `${method} ${url.pathname}`;
  let data;
  try {
    data = JSON.parse(await response.text());
  } catch (error) {
    throw new ServerError(`Unexpected response to ${requestLabel} (HTTP ${response.status}, not JSON). Is ${serverURL} the bookmarks server?`);
  }

  if (data && typeof data === "object" && !Array.isArray(data) && data.error) {
    const details = data.details || data.message;
    let message = details ? `${data.error}: ${details}` : String(data.error);
    if (!response.ok) {
      message += ` (HTTP ${response.status} for ${requestLabel})`;
    }
    throw new ServerError(message);
  }
  if (!response.ok) {
    throw new ServerError(`HTTP ${response.status} for ${requestLabel}`);
  }
  return data;
}

async function searchBookmarks(serverURL, query) {
  const results = await apiRequest(serverURL, "/search", {
    params: { q: query, format: "json" },
  });
  if (!Array.isArray(results)) {
    throw new ServerError(`Unexpected search response from ${serverURL}. Is it the bookmarks server?`);
  }
  return results;
}

async function addBookmark(serverURL, { url, title, category = "unsorted", tags = "" }) {
  const result = await apiRequest(serverURL, "/add", {
    method: "POST",
    body: { url, title, category, tags },
  });
  if (!result || !result.success) {
    throw new ServerError(`Unexpected response from ${serverURL}/add: ${JSON.stringify(result)}`);
  }
  return result;
}

// Used by the options page to check a server URL before relying on it
async function checkServer(serverURL) {
  let response;
  try {
    response = await fetchWithTimeout(`${serverURL}/search?format=json&q=`, {
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    return { ok: false, message: connectionErrorMessage(serverURL) };
  }
  if (response.redirected) {
    return { ok: false, message: redirectErrorMessage(serverURL, response.url) };
  }
  let data;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }
  if (!Array.isArray(data)) {
    return { ok: false, message: `${serverURL} answered, but not like the bookmarks server (HTTP ${response.status}). Check the URL.` };
  }
  return { ok: true, message: `Connected to ${serverURL}.` };
}
