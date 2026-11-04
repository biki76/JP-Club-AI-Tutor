import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from './utils/auth.ts';
import { validateMessageRequest, validateLlmResponse } from './utils/validation.ts';
import { getSystemPrompt, JSON_SCHEMA_INSTRUCTION } from './prompts/tutor.ts';
import { callGroq } from './providers/groq.ts';
import { callGemini } from './providers/gemini.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Update to your specific domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate
    const { user, supabase } = await verifyAuth(req);

    // 2. Parse and Validate Request
    const body = await req.json();
    const validated = validateMessageRequest(body);

    if (validated.action === 'create_session') {
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id, jlpt_level: validated.level || 'N5' })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: { sessionId: session.id } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (validated.action === 'get_sessions') {
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('id, jlpt_level, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: sessions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (validated.action === 'send_message') {
      const { message, level, sessionId } = validated;
      let currentSessionId = sessionId;

      // Create session if none provided
      if (!currentSessionId) {
        const { data: newSession, error: sessErr } = await supabase
          .from('chat_sessions')
          .insert({ user_id: user.id, jlpt_level: level })
          .select()
          .single();
        if (sessErr) throw sessErr;
        currentSessionId = newSession.id;
      }

      // Fetch context (last 6 messages)
      const { data: history, error: histErr } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', currentSessionId)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (histErr) throw histErr;

      // Construct LLM messages
      const systemPrompt = `${getSystemPrompt(level)}\n\n${JSON_SCHEMA_INSTRUCTION}`;
      const llmMessages = [
        { role: 'system', content: systemPrompt },
        ...(history || []).reverse().map((m: any) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ];

      // 3. Call LLM Provider
      const provider = Deno.env.get('AI_PROVIDER') || 'groq';
      let rawResponse = '';
      
      if (provider === 'groq') {
        rawResponse = await callGroq(llmMessages, Deno.env.get('AI_MODEL'), Deno.env.get('GROQ_API_KEY')!);
      } else {
        rawResponse = await callGemini(llmMessages, Deno.env.get('AI_MODEL'), Deno.env.get('GEMINI_API_KEY')!);
      }

      // Clean markdown if present
      const cleanJson = rawResponse.replace(/^```json\s*|\s*```$/g, '').trim();
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanJson);
      } catch (e) {
        throw new Error('LLM returned invalid JSON');
      }

      // 4. Validate LLM Output
      if (!validateLlmResponse(parsedResponse)) {
        throw new Error('LLM response failed schema validation');
      }

      // 5. Persist Messages
      const { error: insertUserErr } = await supabase.from('chat_messages').insert({
        session_id: currentSessionId, role: 'user', content: message
      });
      if (insertUserErr) throw insertUserErr;

      const { error: insertAiErr } = await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: parsedResponse.reply,
        correction: parsedResponse.correction,
        suggestion: parsedResponse.suggestion
      });
      if (insertAiErr) throw insertAiErr;

      // 6. Return Response
      return new Response(JSON.stringify({
        success: true,
        data: {
          sessionId: currentSessionId,
          reply: parsedResponse.reply,
          correction: parsedResponse.correction,
          suggestion: parsedResponse.suggestion,
          level: parsedResponse.level || level
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    const status = error.message.includes('Unauthorized') ? 401 : 500;
    return new Response(JSON.stringify({ 
      success: false, 
      error: status === 401 ? 'Authentication failed' : 'Internal server error' 
    }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
