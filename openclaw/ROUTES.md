# OpenClaw (mini) Routes

This document enumerates **all HTTP routes implemented in this repository’s `openclaw/src` (mini build)**.

> Notes
> - Some servers in this repo bind sockets (e.g. port probing) but do **not** implement HTTP routes; those are not listed as routes here.
> - Line references below point to the source that registers the route.

## `openclaw serve` (embedded mini web chat)

Defined in `src/agents/mini-agent.ts` (`runServe()`).

### `GET /`

- **Purpose**: Serve the embedded chat HTML page.
- **Response**:
  - `200 text/html; charset=utf-8`

Source: `src/agents/mini-agent.ts` (`runServe`).

### `POST /api/chat`

- **Purpose**: Send a chat message and receive the assistant output.
- **Request**:
  - **Headers**: `content-type: application/json`
  - **Body (JSON)**:

```json
{
  "sessionId": "optional string",
  "message": "string (required unless reset=true)",
  "reset": "optional boolean"
}
```

- **Behavior**:
  - If `reset === true`:
    - Resets the session and returns `{ sessionId, output: "Session reset." }`
  - Else:
    - `message` is required; if missing/blank → error `"Message is required"`

- **Success response**:
  - `200 application/json; charset=utf-8`

```json
{
  "sessionId": "string",
  "output": "string"
}
```

- **Error response**:
  - `500 application/json; charset=utf-8`

```json
{ "error": "string" }
```

Source: `src/agents/mini-agent.ts` (`handleChatRequest`, `runServe`).

### Fallbacks

- Any other method/path:
  - `404 text/plain; charset=utf-8` with body `Not found`

Source: `src/agents/mini-agent.ts` (`runServe`).

## Media server

Defined in `src/media/server.ts` (`startMediaServer()` / `attachMediaRoutes()`).

### `GET /media/:id`

- **Purpose**: Fetch a media blob by id from the media store.
- **Params**:
  - `:id` must match `/^[\p{L}\p{N}._-]+$/u`, not `"."` or `".."`, and length ≤ 200.
- **Responses**:
  - `200` with detected `Content-Type` (best effort) and binary body
  - `400` `"invalid path"` (invalid id or invalid path)
  - `404` `"not found"`
  - `410` `"expired"` (older than TTL; file removed)
  - `413` `"too large"` (exceeds max bytes)

Source: `src/media/server.ts` (`attachMediaRoutes`).

## Browser bridge server (mini build stub)

Defined in `src/browser/bridge-server.ts` (`startBrowserBridgeServer()`).

### `ANY /*` (all requests)

- **Purpose**: Stub endpoint; mini build does not support the browser bridge.
- **Response**:
  - `503 application/json; charset=utf-8`

```json
{ "error": "Browser bridge is unavailable in the mini build." }
```

Source: `src/browser/bridge-server.ts` (`startBrowserBridgeServer`).

