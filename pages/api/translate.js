export default async function handler(req, res) {
  const { text, targetLang } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;
  const prompt = `Translate the following text to ${targetLang}:\n${text}`;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  const translatedText = data.choices?.[0]?.message?.content || "";
  res.status(200).json({ translatedText });
}