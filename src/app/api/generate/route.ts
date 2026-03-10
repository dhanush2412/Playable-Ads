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
    baseTemplateHtml, // injected reference HTML (optional)
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

  const hasTemplate = baseTemplateHtml && baseTemplateHtml.trim().length > 100;

  const system = hasTemplate
    ? `You are an expert HTML5 playable ad developer. You will be given a polished, working reference playable ad HTML. Your job is to adapt it for a different game while keeping ALL of the visual polish, animations, layout, and code structure intact.

RULES:
- Output ONLY the complete HTML. No explanations, no markdown, no code fences. Start with <!DOCTYPE html>.
- Keep the visual structure, animation style, font choices, and overall polish of the reference
- Change ONLY: game mechanic/logic, colors (primaryColor/secondaryColor), game name, store URLs, timer value, grid content
- Keep the MRAID CTA pattern exactly: if(typeof mraid!=='undefined') mraid.open(url); else window.open(url,'_blank');
- Keep tutorial animation (pointing hand or highlight) but adapt it for the new mechanic
- Keep the end screen / CTA flow
- All assets must remain inlined (no external URLs)
- Network limit: ${networkLimit}`
    : `You are an expert HTML5 playable ad developer for mobile games. Generate a single self-contained index.html playable ad.

RULES:
- Output ONLY the complete HTML. No explanations, no markdown, no code fences. Start with <!DOCTYPE html>.
- Everything inlined: CSS in <style>, JS in <script>, images as base64 or SVG
- No external CDN, no external asset URLs
- MRAID CTA: if(typeof mraid!=='undefined') mraid.open(url); else window.open(url,'_blank');
- Game completable in ${timeLimit} seconds max
- First 2-3 seconds: tutorial animation (pointing hand or highlight)
- After game ends: "Download Now" CTA opens store
- Detect platform: iOS store for iPhone/iPad, Android URL for Android
- Network limit: ${networkLimit}
- Visually polished with smooth animations, gradients, and particle effects`;

  const prompt = hasTemplate
    ? `Here is the reference playable ad to use as your base:

<reference_html>
${baseTemplateHtml}
</reference_html>

Now adapt it for this new game:
- Game Name: ${gameName}
- Core Mechanic: ${mechanic}
- Primary Color: ${primaryColor}
- Secondary Color: ${secondaryColor}
- Time Limit: ${timeLimit} seconds
- iOS Store URL: ${iosStoreUrl || "https://apps.apple.com"}
- Android Store URL: ${androidStoreUrl || "https://play.google.com"}
- Target Network: ${targetNetwork}

Output the full adapted index.html now. Start with <!DOCTYPE html> and output nothing else.`
    : `Create a complete playable ad for this mobile game:

Game Name: ${gameName}
Core Mechanic: ${mechanic}
Primary Color: ${primaryColor}
Secondary Color: ${secondaryColor}
Time Limit: ${timeLimit} seconds
iOS Store URL: ${iosStoreUrl || "https://apps.apple.com"}
Android Store URL: ${androidStoreUrl || "https://play.google.com"}
Target Ad Network: ${targetNetwork}

Generate the full index.html now. Start with <!DOCTYPE html> and output nothing else.`;

  const result = streamText({
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    system,
    prompt,
  });

  return result.toTextStreamResponse();
}
