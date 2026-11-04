# AI Tutor Security Plan

1. **No Client-Side Secrets**: LLM API keys (`GROQ_API_KEY`, `GEMINI_API_KEY`) are stored exclusively as Supabase Edge Function secrets.
2. **JWT Verification**: Every request is validated via `supabase.auth.getUser()`. The `user_id` is derived from the token, never from the request body.
3. **Input Sanitization**: Message length is capped at 500 characters. `level` is strictly validated against an allowlist (`N5`, `N4`, `N3`).
4. **Output Validation**: The Edge Function parses and validates the LLM's JSON response against a strict schema before it is saved to the database or returned to the client, preventing XSS or frontend crashes.
5. **RLS**: Database policies ensure absolute tenant isolation at the PostgreSQL level.
