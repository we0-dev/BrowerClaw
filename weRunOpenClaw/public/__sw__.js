/**
 * Nodepod Service Worker — proxies requests to virtual servers.
 * Version: 2 (cross-origin passthrough + prefix stripping)
 *
 * Intercepts:
 *   /__virtual__/{port}/{path}  — virtual server API
 *   /__preview__/{port}/{path}  — preview iframe navigation
 *   Any request from a client loaded via /__preview__/ — module imports etc.
 *
 * When an iframe navigates to /__preview__/{port}/, the SW records the
 * resulting clientId. All subsequent requests from that client (including
 * ES module imports like /@react-refresh) are intercepted and routed
 * through the virtual server.
 */
const SW_VERSION = 5;
let port = null;
let nextId = 1;
const pending = new Map();
const previewClients = new Map();
let previewScript = null;
let watermarkEnabled = true;
// 用于判断“是不是一次新的页面/iframe导航（比如刷新）”
let lastNavigationClientId = null;
const MIME_TYPES = {
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".cjs": "application/javascript",
  ".ts": "application/javascript",
  ".tsx": "application/javascript",
  ".jsx": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".wasm": "application/wasm",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".md": "text/markdown",
};
function inferMimeType(path, responseHeaders) {
  const ct =
    responseHeaders["content-type"] || responseHeaders["Content-Type"] || "";
  if (ct && !ct.includes("text/html")) return null;
  const cleanPath = path.split("?")[0].split("#")[0];
  const lastDot = cleanPath.lastIndexOf(".");
  const ext = lastDot >= 0 ? cleanPath.slice(lastDot).toLowerCase() : "";
  if (ext && MIME_TYPES[ext]) return MIME_TYPES[ext];
  return null;
}
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("message", (event) => {
  const data = event.data;
  if (data?.type === "init" && data.port) {
    port = data.port;
    // 清掉旧的预览映射，避免刷新后复用到失效的 clientId -> serverPort
    previewClients.clear();
    port.onmessage = onPortMessage;
  }
  if (data?.type === "register-preview") {
    previewClients.set(data.clientId, data.serverPort);
  }
  if (data?.type === "unregister-preview") {
    previewClients.delete(data.clientId);
  }
  if (data?.type === "set-preview-script") {
    previewScript = data.script ?? null;
  }
  if (data?.type === "set-watermark") {
    watermarkEnabled = !!data.enabled;
  }
});
function onPortMessage(event) {
  const msg = event.data;
  if (msg.type === "response" && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error));
    else resolve(msg.data);
  }
}
self.addEventListener("fetch", (event) => {
  // 避免使用“刷新后仍残留”的旧 MessagePort 导致卡死
  // navigate 场景通常对应页面刷新/重新进入 iframe
  try {
    if (event.request?.mode === "navigate" && event.resultingClientId) {
      if (event.resultingClientId !== lastNavigationClientId) {
        port = null;
        previewClients.clear();
        lastNavigationClientId = event.resultingClientId;
      }
    }
  } catch {
    // ignore
  }
  const url = new URL(event.request.url);
  const virtualMatch = url.pathname.match(/^\/__virtual__\/(\d+)(\/.*)?$/);
  if (virtualMatch) {
    const serverPort = parseInt(virtualMatch[1], 10);
    const path = (virtualMatch[2] || "/") + url.search;
    event.respondWith(proxyToVirtualServer(event.request, serverPort, path));
    return;
  }
  const previewMatch = url.pathname.match(/^\/__preview__\/(\d+)(\/.*)?$/);
  if (previewMatch) {
    const serverPort = parseInt(previewMatch[1], 10);
    const path = (previewMatch[2] || "/") + url.search;
    if (event.request.mode === "navigate") {
      event.respondWith(
        (async () => {
          if (event.resultingClientId) {
            previewClients.set(event.resultingClientId, serverPort);
          }
          return proxyToVirtualServer(event.request, serverPort, path);
        })()
      );
    } else {
      event.respondWith(proxyToVirtualServer(event.request, serverPort, path));
    }
    return;
  }
  const clientId = event.clientId;
  if (clientId && previewClients.has(clientId)) {
    const host = url.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === self.location.hostname
    ) {
      const serverPort = previewClients.get(clientId);
      let path = url.pathname;
      const ppMatch = path.match(/^\/__preview__\/\d+(.*)?$/);
      if (ppMatch) {
        path = ppMatch[1] || "/";
        if (path[0] !== "/") path = "/" + path;
      }
      path += url.search;
      event.respondWith(
        proxyToVirtualServer(event.request, serverPort, path, event.request)
      );
      return;
    }
  }
  const referer = event.request.referrer;
  if (referer) {
    try {
      const refUrl = new URL(referer);
      const refMatch = refUrl.pathname.match(/^\/__preview__\/(\d+)/);
      if (refMatch) {
        const host = url.hostname;
        if (
          host === "localhost" ||
          host === "127.0.0.1" ||
          host === "0.0.0.0" ||
          host === self.location.hostname
        ) {
          const serverPort = parseInt(refMatch[1], 10);
          let path = url.pathname;
          const ppMatch2 = path.match(/^\/__preview__\/\d+(.*)?$/);
          if (ppMatch2) {
            path = ppMatch2[1] || "/";
            if (path[0] !== "/") path = "/" + path;
          }
          path += url.search;
          if (clientId) {
            previewClients.set(clientId, serverPort);
          }
          event.respondWith(
            proxyToVirtualServer(event.request, serverPort, path, event.request)
          );
          return;
        }
      }
    } catch {
      // ignore
    }
  }
});
const WS_SHIM_SCRIPT = `<script>
(function() {
  if (window.__nodepodWsShim) return;
  window.__nodepodWsShim = true;
  var NativeWS = window.WebSocket;
  // 必须与 WeNode RequestProxy._startWsBridge 的频道名一致，否则 Vite HMR 等 WebSocket 无法桥接
  var bc = new BroadcastChannel("weNode-ws");
  var nextId = 0;
  var active = {};
  var _previewPort = 0;
  try {
    var _m = location.pathname.match(/^\\/__preview__\\/(\\d+)/);
    if (_m) _previewPort = parseInt(_m[1], 10);
  } catch(e) {}
  function NodepodWS(url, protocols) {
    var parsed;
    try { parsed = new URL(url, location.href); } catch(e) {
      return new NativeWS(url, protocols);
    }
    var host = parsed.hostname;
    if (host !== "localhost" && host !== "127.0.0.1" && host !== "0.0.0.0") {
      return new NativeWS(url, protocols);
    }
    var self = this;
    var uid = "ws-iframe-" + (++nextId) + "-" + Math.random().toString(36).slice(2,8);
    var port = _previewPort || parseInt(parsed.port) || (parsed.protocol === "wss:" ? 443 : 80);
    var path = parsed.pathname + parsed.search;
    self.url = url;
    self.readyState = 0;
    self.protocol = "";
    self.extensions = "";
    self.bufferedAmount = 0;
    self.binaryType = "blob";
    self.onopen = null;
    self.onclose = null;
    self.onerror = null;
    self.onmessage = null;
    self._uid = uid;
    self._listeners = {};
    active[uid] = self;
    bc.postMessage({
      kind: "ws-connect",
      uid: uid,
      port: port,
      path: path,
      protocols: Array.isArray(protocols) ? protocols.join(",") : (protocols || "")
    });
    self._connectTimer = setTimeout(function() {
      if (self.readyState === 0) {
        self.readyState = 3;
        var e = new Event("error");
        self.onerror && self.onerror(e);
        _emit(self, "error", e);
        delete active[uid];
      }
    }, 5000);
  }
  function _emit(ws, evt, arg) {
    var list = ws._listeners[evt];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      try { list[i].call(ws, arg); } catch(e) {}
    }
  }
  NodepodWS.prototype.addEventListener = function(evt, fn) {
    if (!this._listeners[evt]) this._listeners[evt] = [];
    this._listeners[evt].push(fn);
  };
  NodepodWS.prototype.removeEventListener = function(evt, fn) {
    var list = this._listeners[evt];
    if (!list) return;
    this._listeners[evt] = list.filter(function(f) { return f !== fn; });
  };
  NodepodWS.prototype.dispatchEvent = function(evt) {
    _emit(this, evt.type, evt);
    return true;
  };
  NodepodWS.prototype.send = function(data) {
    if (this.readyState !== 1) throw new Error("WebSocket is not open");
    var type = "text";
    var payload = data;
    if (data instanceof ArrayBuffer) {
      type = "binary";
      payload = Array.from(new Uint8Array(data));
    } else if (data instanceof Uint8Array) {
      type = "binary";
      payload = Array.from(data);
    }
    bc.postMessage({ kind: "ws-send", uid: this._uid, data: payload, type: type });
  };
  NodepodWS.prototype.close = function(code, reason) {
    if (this.readyState >= 2) return;
    this.readyState = 2;
    bc.postMessage({ kind: "ws-close", uid: this._uid, code: code || 1000, reason: reason || "" });
    var self = this;
    setTimeout(function() {
      self.readyState = 3;
      var e = new CloseEvent("close", { code: code || 1000, reason: reason || "", wasClean: true });
      self.onclose && self.onclose(e);
      _emit(self, "close", e);
      delete active[self._uid];
    }, 0);
  };
  NodepodWS.CONNECTING = 0;
  NodepodWS.OPEN = 1;
  NodepodWS.CLOSING = 2;
  NodepodWS.CLOSED = 3;
  NodepodWS.prototype.CONNECTING = 0;
  NodepodWS.prototype.OPEN = 1;
  NodepodWS.prototype.CLOSING = 2;
  NodepodWS.prototype.CLOSED = 3;
  bc.onmessage = function(ev) {
    var d = ev.data;
    if (!d || !d.uid) return;
    var ws = active[d.uid];
    if (!ws) return;
    if (d.kind === "ws-open") {
      clearTimeout(ws._connectTimer);
      ws.readyState = 1;
      var e = new Event("open");
      ws.onopen && ws.onopen(e);
      _emit(ws, "open", e);
    } else if (d.kind === "ws-message") {
      var msgData;
      if (d.type === "binary") {
        msgData = new Uint8Array(d.data).buffer;
      } else {
        msgData = d.data;
      }
      var me = new MessageEvent("message", { data: msgData });
      ws.onmessage && ws.onmessage(me);
      _emit(ws, "message", me);
    } else if (d.kind === "ws-closed") {
      ws.readyState = 3;
      clearTimeout(ws._connectTimer);
      var ce = new CloseEvent("close", { code: d.code || 1000, reason: "", wasClean: true });
      ws.onclose && ws.onclose(ce);
      _emit(ws, "close", ce);
      delete active[d.uid];
    } else if (d.kind === "ws-error") {
      ws.readyState = 3;
      clearTimeout(ws._connectTimer);
      var ee = new Event("error");
      ws.onerror && ws.onerror(ee);
      _emit(ws, "error", ee);
      delete active[d.uid];
    }
  };
  window.WebSocket = NodepodWS;
})();
</script>`;
const WATERMARK_SCRIPT = ``;
function errorPage(status, title, message) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${status} - ${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0a0a0a; color: #e0e0e0;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 2rem;
  }
  .container { max-width: 480px; text-align: center; }
  .status { font-size: 5rem; font-weight: 700; color: #555; line-height: 1; }
  .title { font-size: 1.25rem; margin-top: 0.75rem; color: #ccc; }
  .message { font-size: 0.875rem; margin-top: 1rem; color: #888; line-height: 1.5; }
  .hint { font-size: 0.8rem; margin-top: 1.5rem; color: #555; }
</style>
</head>
<body>
<div class="container">
  <div class="status">${status}</div>
  <div class="title">${title}</div>
  <div class="message">${message}</div>
  <div class="hint">Powered by Nodepod</div>
</div>
</body>
</html>`;
  return new Response(html, {
    status,
    statusText: title,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  });
}
async function proxyToVirtualServer(request, serverPort, path, originalRequest) {
  if (!port) {
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({ type: "sw-needs-init" });
    }
    // 给主线程/iframe 一个时间把新的 MessagePort 发回来
    await new Promise((r) => setTimeout(r, 1000));
    if (!port) {
      return errorPage(
        503,
        "Service Unavailable",
        "The Nodepod service worker is still initializing. Please refresh the page."
      );
    }
  }
  const fallbackRequest = originalRequest ? originalRequest.clone() : null;
  const headers = {};
  request.headers.forEach((v, k) => {
    headers[k] = v;
  });
  headers["host"] = `localhost:${serverPort}`;
  let body = undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = await request.arrayBuffer();
    } catch {
      // ignore
    }
  }
  const id = nextId++;
  const promise = new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error("Request timeout: " + path));
      }
    }, 3000000);
  });
  port.postMessage({
    type: "request",
    id,
    data: {
      port: serverPort,
      method: request.method,
      url: path,
      headers,
      body,
      originalUrl: request.url,
    },
  });
  try {
    const data = await promise;
    let responseBody = null;
    if (data.bodyBase64) {
      const binary = atob(data.bodyBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      responseBody = bytes;
    }
    const respHeaders = Object.assign({}, data.headers || {});
    const overrideMime = inferMimeType(path, respHeaders);
    if (overrideMime) {
      for (const k of Object.keys(respHeaders)) {
        if (k.toLowerCase() === "content-type") delete respHeaders[k];
      }
      respHeaders["content-type"] = overrideMime;
    }
    let finalBody = responseBody;
    const ct = respHeaders["content-type"] || respHeaders["Content-Type"] || "";
    if (ct.includes("text/html") && responseBody) {
      let injection = WS_SHIM_SCRIPT;
      if (previewScript) injection += `<script>${previewScript}<` + `/script>`;
      if (watermarkEnabled) injection += WATERMARK_SCRIPT;
      const html = new TextDecoder().decode(responseBody);
      const headIdx = html.indexOf("<head");
      if (headIdx >= 0) {
        const closeAngle = html.indexOf(">", headIdx);
        if (closeAngle >= 0) {
          const injected =
            html.slice(0, closeAngle + 1) +
            injection +
            html.slice(closeAngle + 1);
          finalBody = new TextEncoder().encode(injected);
        }
      } else {
        finalBody = new TextEncoder().encode(injection + html);
      }
      for (const k of Object.keys(respHeaders)) {
        if (k.toLowerCase() === "content-length") {
          respHeaders[k] = String(finalBody.byteLength);
        }
      }
    }
    if (
      !respHeaders["cross-origin-resource-policy"] &&
      !respHeaders["Cross-Origin-Resource-Policy"]
    ) {
      respHeaders["Cross-Origin-Resource-Policy"] = "cross-origin";
    }
    if (
      !respHeaders["cross-origin-embedder-policy"] &&
      !respHeaders["Cross-Origin-Embedder-Policy"]
    ) {
      respHeaders["Cross-Origin-Embedder-Policy"] = "credentialless";
    }
    if (
      !respHeaders["cross-origin-opener-policy"] &&
      !respHeaders["Cross-Origin-Opener-Policy"]
    ) {
      respHeaders["Cross-Origin-Opener-Policy"] = "same-origin";
    }
    if (data.statusCode === 404 && fallbackRequest) {
      try {
        return await fetch(fallbackRequest);
      } catch {
        // ignore
      }
    }
    return new Response(finalBody, {
      status: data.statusCode || 200,
      statusText: data.statusMessage || "OK",
      headers: respHeaders,
    });
  } catch (err) {
    const msg = err?.message || "Proxy error";
    if (String(msg).includes("timeout")) {
      return errorPage(
        504,
        "Gateway Timeout",
        "No server responded on port " +
          serverPort +
          ". Make sure your dev server is running."
      );
    }
    return errorPage(502, "Bad Gateway", msg);
  }
}

