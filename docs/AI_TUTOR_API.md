# AI Tutor Edge Function API

**Endpoint**: `POST https://<project-ref>.supabase.co/functions/v1/ai-tutor`
**Headers**: 
- `Authorization: Bearer <supabase-jwt>`
- `Content-Type: application/json`

## Actions

### `send_message`
**Request**:
```json
{
  "action": "send_message",
  "message": "わたしは学生ですを",
  "level": "N5",
  "sessionId": "optional-uuid"
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "reply": "はい、いいですね。",
    "correction": { "original": "...", "corrected": "...", "explanation": "..." },
    "suggestion": null,
    "level": "N5"
  }
}
```

### `create_session`
Creates a new chat session for the authenticated user.

### `get_sessions`
Returns the last 10 chat sessions for the authenticated user, ordered by `updated_at`.
