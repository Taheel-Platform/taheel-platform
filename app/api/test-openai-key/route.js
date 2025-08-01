import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const testPrompt = "Say hello in English.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: testPrompt }],
        max_tokens: 20,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    return NextResponse.json({
      testMessage: data.choices?.[0]?.message?.content || "",
      raw: data,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || "Unknown error" },
      { status: 500 }
    );
  }
}