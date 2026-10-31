export function ruleBasedRewrite(text: string): string {
  const cleaned = text.replace(/\b(i think|i love|awesome|amazing|really|very)\b/gi, '').replace(/\s+/g, ' ').trim();
  return cleaned.split(' ').slice(0, 15).join(' ').replace(/[.!?]+$/, '');
}

export async function rewriteDescription(text: string, apiKey = process.env.GEMINI_API_KEY, fetcher: typeof fetch = fetch): Promise<string> {
  if (!apiKey) return ruleBasedRewrite(text);
  try {
    const response = await fetcher('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + encodeURIComponent(apiKey), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `Rewrite under 15 words, present tense, neutral, no opinions: ${text}` }] }] })
    });
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return result ? ruleBasedRewrite(result) : ruleBasedRewrite(text);
  } catch { return ruleBasedRewrite(text); }
}
