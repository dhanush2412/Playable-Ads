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
            model: groq("llama-3.1-8b-instant"), // Fast 8B: just needs short JSON
            maxOutputTokens: 300,
            system: `Mobile ad strategist. Output JSON only. No explanation.`,
            prompt: `Game: ${gameName}, Mechanic: ${mechanic}, Network: ${targetNetwork}, Colors: ${primaryColor}/${secondaryColor}, Time: ${timeLimit}s
Output ONLY: {"hook":"...","tutorialStep":"...","winCondition":"...","emotionalTrigger":"...","ctaText":"..."}`,
          }),
          generateText({
            model: groq("llama-3.1-8b-instant"), // Fast 8B: just needs short JSON
            maxOutputTokens: 300,
            system: `CSS designer for mobile ads. Output JSON only. No explanation.`,
            prompt: `Game: ${gameName}, Primary: ${primaryColor}, Secondary: ${secondaryColor}
Output ONLY: {"bgStyle":"...","tileStyle":"...","selectedStyle":"...","buttonStyle":"...","accentGlow":"..."}`,
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
        const coderSystem = `You are a world-class HTML5 playable ad developer. You create stunning, polished, fully-functional single-file playable ads for mobile ad networks.

ABSOLUTE RULES — NEVER BREAK THESE:
- Output ONLY raw HTML starting with <!DOCTYPE html>. Zero markdown. Zero code fences. Zero explanation.
- All CSS and JS must be inlined inside the single HTML file. No external resources.
- MRAID CTA must be: if(typeof mraid!=='undefined') mraid.open(url); else window.open(url,'_blank');
- Network limit: ${networkLimit}

QUALITY STANDARDS — every ad you output must have ALL of these. Write COMPREHENSIVE, COMPLETE code — do not shorten or truncate:
1. VISUAL POLISH: Rich CSS with gradients, box-shadows, border-radius, transitions. Not flat or plain. Include hover/active states.
2. ANIMATIONS: Full @keyframes for matchFlash, ctaPulse, overlayFadeIn, tutorialBounce, scorePopup. Write out every keyframe step.
3. TUTORIAL: For the first 2 seconds, show a bouncing arrow (↓) AND a glowing ring on the first valid tile pair. Remove after first tap.
4. GAME LOOP: Complete 4×4 grid (16 tiles), numbers 1-9, pairs that sum to 10. Full timer logic. Score with bonus. Combo multiplier.
5. END STATE: Overlay with slide-in animation. Show final score, pairs cleared, time remaining, and prominent CTA button.
6. RESPONSIVE: max-width:360px centered. Looks great at 320×568. Font sizes use clamp() or vw units.
7. TYPOGRAPHY: System font stack. Bold tile numbers. Animated score counter.
8. COMPLETENESS: Output the ENTIRE file — every CSS rule, every JS function, every HTML element. Never truncate.

${hasTemplate
  ? `ADAPTATION RULES:
- Use the reference template's HTML structure, CSS architecture, and JS game logic as the foundation
- Restyle completely using the design spec (new colors, new gradients, new tile styles)
- Update all text: game name, CTA text, store URLs, dialogue
- Keep the working game logic intact — just retheme it`
  : `CONSTRUCTION RULES:
- Build a clean, centered layout: header with game name + logo emoji, stats bar (score/pairs/timer), 4×4 grid, footer rule
- Use the design spec colors for background, tiles, selected state, and CTA
- Make tiles feel tactile: white card tiles with subtle shadow, selected state uses primary color fill`}`;

        const coderPrompt = hasTemplate
          ? `RESEARCHER BRIEF: ${JSON.stringify(brief)}
DESIGNER SPEC: ${JSON.stringify(design)}

REFERENCE TEMPLATE TO ADAPT:
<reference>
${baseTemplateHtml}
</reference>

ADAPTATION TARGETS:
- Game name: ${gameName}
- Mechanic description: ${mechanic}
- Primary color: ${primaryColor}  Secondary color: ${secondaryColor}
- Timer: ${timeLimit}s
- iOS store URL: ${iosStoreUrl || "https://apps.apple.com"}
- Android store URL: ${androidStoreUrl || "https://play.google.com"}
- Ad network: ${targetNetwork}

Now output the complete adapted index.html:`
          : `RESEARCHER BRIEF: ${JSON.stringify(brief)}
DESIGNER SPEC: ${JSON.stringify(design)}

BUILD TARGETS:
- Game name: ${gameName}
- Mechanic: ${mechanic}
- Primary: ${primaryColor}  Secondary: ${secondaryColor}
- Timer: ${timeLimit}s
- iOS: ${iosStoreUrl || "https://apps.apple.com"}
- Android: ${androidStoreUrl || "https://play.google.com"}
- Network: ${targetNetwork}

Now output the complete polished index.html:`;

        const coderStream = streamText({
          model: groq("meta-llama/llama-4-scout-17b-16e-instruct"), // 30k TPM on Groq free tier
          maxOutputTokens: 8000,
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
