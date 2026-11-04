export async function callGemini(messages: any[], model: string, apiKey: string) {
  // Convert OpenAI-style messages to Gemini format
  const geminiContents = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: geminiContents,
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
