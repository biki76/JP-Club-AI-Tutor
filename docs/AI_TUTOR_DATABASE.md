# AI Tutor Database Schema

## Tables
1. **`user_profiles`**: Stores user-specific AI tutor preferences (e.g., default `jlpt_level`).
2. **`chat_sessions`**: Represents a distinct conversation thread. Tied to `user_id`.
3. **`chat_messages`**: Individual exchanges within a session. Includes `correction` and `suggestion` as JSONB for structured frontend rendering.

## Security (RLS)
All tables have Row Level Security enabled. Policies strictly enforce that `auth.uid()` must match the `user_id` of the session. Users cannot query, insert, or update records belonging to other users. The Edge Function uses the user's JWT to establish this context securely.
