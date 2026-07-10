# Velunee API — milestone 1

Base URL: `/api/v1`

## Public endpoints

### `GET /health`

Returns service status.

### `GET /system/config`

Returns minimum mobile version, maintenance mode, and feature flags.

## Authenticated endpoints

### `POST /chat/messages`

Request:

```json
{
  "message": "Help me plan a focused evening.",
  "locale": "en-BD",
  "timezone": "Asia/Dhaka",
  "inputMode": "text"
}
```

Optional: `conversationId` to continue a conversation.

Response:

```json
{
  "conversationId": "uuid",
  "requestId": "uuid",
  "provider": "mock",
  "model": "velunee-local-mock",
  "message": {
    "id": "uuid",
    "role": "assistant",
    "content": "...",
    "inputMode": "text",
    "createdAt": "2026-07-10T00:00:00.000Z"
  }
}
```

### `POST /chat/stream`

Uses Server-Sent Events over a POST response. Each event is sent as a JSON `data:` record with one of these types:

- `meta`
- `delta`
- `done`
- `error`

## Authentication

Development mode accepts:

```http
x-dev-user-id: 00000000-0000-4000-8000-000000000001
```

Production mode requires:

```http
Authorization: Bearer <supabase_access_token>
```
