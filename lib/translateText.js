export async function translateText(text, targetLang = "en") {
  const apiKey = process.env.OPENAI_API_KEY;
  const systemMsg = `You are a professional translator. Translate the following text to ${targetLang}. Reply with translation only.`;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: text }
      ],
      max_tokens: 400,
      temperature: 0.1,
    }),
  });
  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
}