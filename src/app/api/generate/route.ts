import { generateText, streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { NextRequest } from "next/server";

export const maxDuration = 60; // Vercel: extend timeout to 60s for 3-agent pipeline

export async function POST(req: NextRequest) {
  const {
    gameName,
    iosStoreUrl,
    androidStoreUrl,
    targetNetwork,
    mechanic,
    primaryColor,
    secondaryColor,
    timeLimit,
    baseTemplateHtml,
  } = await req.json();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured on server" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const groq = createGroq({ apiKey });

  const networkLimit =
    targetNetwork === "meta" || targetNetwork === "ironsource"
      ? "2MB max, single HTML file"
      : "5MB max";

  const hasTemplate = baseTemplateHtml && baseTemplateHtml.trim().length > 100;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));

      try {
        // ── AGENTS 1 + 2: RESEARCHER & DESIGNER (parallel) ───────────────
        send("\x01AGENT:researcher\x02");

        const [researchResult, designResult] = await Promise.all([
          generateText({
            model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
            system: `You are a mobile ad strategist. Output a concise JSON brief for a playable ad. Be specific and practical.`,
            prompt: `Game: ${gameName}
Mechanic: ${mechanic}
Target Network: ${targetNetwork}
Colors: primary=${primaryColor}, secondary=${secondaryColor}
Time limit: ${timeLimit}s

Output ONLY this JSON:
{"hook":"compelling moment to show","tutorialStep":"first action player takes","winCondition":"what triggers CTA","emotionalTrigger":"curiosity/urgency/satisfaction","ctaText":"4-6 word CTA"}`,
          }),
          generateText({
            model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
            system: `You are a mobile UI/UX designer specializing in playable ads. Output a CSS spec as JSON only.`,
            prompt: `Design a playable ad:
Game: ${gameName}, Primary: ${primaryColor}, Secondary: ${secondaryColor}
${hasTemplate ? "Style reference: " + baseTemplateHtml.slice(0, 300) : "Fresh design"}

Output ONLY this JSON:
{"bgStyle":"CSS background","fontFamily":"font stack","tileStyle":"CSS for tiles","selectedStyle":"CSS for selected tile","overlayBg":"end overlay bg","buttonStyle":"CSS for CTA button"}`,
          }),
        ]);

        let brief = { hook: "", tutorialStep: "", winCondition: "", emotionalTrigger: "", ctaText: "Download Now" };
        try {
          const m = researchResult.text.match(/\{[\s\S]*\}/);
          if (m) brief = { ...brief, ...JSON.parse(m[0]) };
        } catch { /* use defaults */ }

        let design = {
          bgStyle: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor}22)`,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          tileStyle: "background:white; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.15)",
          selectedStyle: `background:${primaryColor}; color:white`,
          overlayBg: "rgba(0,0,0,0.92)",
          buttonStyle: `background:${secondaryColor}; color:#000; border-radius:14px; font-weight:700`,
        };
        try {
          const m = designResult.text.match(/\{[\s\S]*\}/);
          if (m) design = { ...design, ...JSON.parse(m[0]) };
        } catch { /* use defaults */ }

        send("\x01AGENT:designer\x02");
        send("\x01AGENT:coder\x02");

        // ── AGENT 3: CODER (streaming) ───────────────────────────────────
        const coderSystem = hasTemplate
          ? `You are an expert HTML5 playable ad developer. Adapt the reference template for a new game.
RULES:
- Output ONLY complete HTML starting with <!DOCTYPE html>. No markdown, no code fences.
- Apply the design spec colors and styles throughout
- Implement the hook, tutorial step, win condition, and CTA text from the brief
- MRAID CTA: if(typeof mraid!=='undefined') mraid.open(url); else window.open(url,'_blank');
- All assets inlined. Network limit: ${networkLimit}`
          : `You are an expert HTML5 playable ad developer. Build a complete, polished playable ad.
RULES:
- Output ONLY complete HTML starting with <!DOCTYPE html>. No markdown, no code fences.
- Implement a 4x4 number grid game where players tap pairs that sum to 10
- Apply the design spec colors and styles
- Show tutorial hint (pulsing highlight) on first pair for 2s
- Game completable in ${timeLimit}s with countdown timer
- Show end overlay with CTA button when win or time expires
- MRAID CTA: if(typeof mraid!=='undefined') mraid.open(url); else window.open(url,'_blank');
- All assets inlined. Network limit: ${networkLimit}`;

        const coderPrompt = hasTemplate
          ? `BRIEF: ${JSON.stringify(brief)}
DESIGN: ${JSON.stringify(design)}
REFERENCE:
<ref>${baseTemplateHtml}</ref>
Adapt for: ${gameName}, mechanic: ${mechanic}, iOS: ${iosStoreUrl || "https://apps.apple.com"}, Android: ${androidStoreUrl || "https://play.google.com"}, network: ${targetNetwork}
Output the full adapted index.html:`
          : `BRIEF: ${JSON.stringify(brief)}
DESIGN: ${JSON.stringify(design)}
BUILD: game=${gameName}, mechanic=${mechanic}, primary=${primaryColor}, secondary=${secondaryColor}, time=${timeLimit}s, iOS=${iosStoreUrl || "https://apps.apple.com"}, Android=${androidStoreUrl || "https://play.google.com"}, network=${targetNetwork}
Output the full index.html:`;

        const coderStream = streamText({
          model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
          system: coderSystem,
          prompt: coderPrompt,
        });

        send("\x01AGENT:streaming\x02");

        for await (const chunk of coderStream.textStream) {
          send(chunk);
        }

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Generation failed";
        send(`\x01ERROR:${msg}\x02`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
