import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const {
    apiKey,
    gameName,
    iosStoreUrl,
    androidStoreUrl,
    targetNetwork,
    mechanic,
    primaryColor,
    secondaryColor,
    timeLimit,
  } = await req.json();

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Groq API key required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const groq = createGroq({ apiKey });

  const networkLimit =
    targetNetwork === "meta" || targetNetwork === "ironsource"
      ? "2MB max, single HTML file"
      : "5MB max";

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: `You are an expert HTML5 playable ad developer for mobile games. Your job is to generate a single self-contained index.html playable ad.

STRICT RULES:
- Output ONLY the complete HTML. No explanations, no markdown, no code blocks. Just raw HTML starting with <!DOCTYPE html>.
- Everything must be inlined: CSS in <style>, JS in <script>, images as base64 or SVG inline
- No external CDN, no external URLs for assets
- MRAID store link CTA must use: if(typeof mraid!=='undefined') mraid.open(url); else window.open(url,'_blank');
- Game must be completable in ${timeLimit} seconds max
- First 2-3 seconds: show a tutorial animation (pointing hand or highlight) showing what to tap
- After game ends (win or timeout): show a "Download Now" CTA button that opens the store
- Use iOS store URL for iPhone/iPad, Android URL for Android (detect via userAgent)
- Network limit: ${networkLimit}
- Make the game visually polished with smooth animations`,

    prompt: `Create a complete playable ad for this mobile game:

Game Name: ${gameName}
Core Mechanic: ${mechanic}
Primary Color: ${primaryColor}
Secondary Color: ${secondaryColor}
Time Limit: ${timeLimit} seconds
iOS Store URL: ${iosStoreUrl}
Android Store URL: ${androidStoreUrl}
Target Ad Network: ${targetNetwork}

Generate the full index.html now. Start with <!DOCTYPE html> and output nothing else.`,
  });

  return result.toTextStreamResponse();
}
