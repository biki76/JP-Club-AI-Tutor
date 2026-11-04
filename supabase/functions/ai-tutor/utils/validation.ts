export function validateMessageRequest(body: any) {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body');
  if (!['send_message', 'create_session', 'get_sessions', 'get_history'].includes(body.action)) {
    throw new Error('Invalid action');
  }
  if (body.action === 'send_message') {
    if (typeof body.message !== 'string' || body.message.trim().length === 0) {
      throw new Error('Message is required and must be a non-empty string');
    }
    if (body.message.length > 500) {
      throw new Error('Message exceeds maximum length of 500 characters');
    }
    if (!['N5', 'N4', 'N3'].includes(body.level)) {
      throw new Error('Invalid JLPT level. Must be N5, N4, or N3');
    }
    if (body.sessionId && typeof body.sessionId !== 'string') {
      throw new Error('Invalid sessionId format');
    }
  }
  return body;
}

export function validateLlmResponse(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.reply !== 'string') return false;
  if (data.level && !['N5', 'N4', 'N3'].includes(data.level)) return false;
  
  if (data.correction !== null && data.correction !== undefined) {
    if (typeof data.correction !== 'object') return false;
    if (typeof data.correction.original !== 'string') return false;
    if (typeof data.correction.corrected !== 'string') return false;
    if (typeof data.correction.explanation !== 'string') return false;
  }
  
  if (data.suggestion !== null && data.suggestion !== undefined) {
    if (typeof data.suggestion !== 'object') return false;
    if (typeof data.suggestion.text !== 'string') return false;
    if (typeof data.suggestion.explanation !== 'string') return false;
  }
  return true;
}
