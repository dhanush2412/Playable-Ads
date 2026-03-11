import { generateText, streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { NextRequest } from "next/server";

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

  // Streaming response with agent status events
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));

      try {
        // ── AGENT 1: RESEARCHER ──────────────────────────────────────────
        send("\x01AGENT:researcher\x02");

        const researchResult = await generateText({
          model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
          system: `You are a mobile ad strategist. Analyze a game and output a concise JSON brief for creating a playable ad. Be specific and practical.`,
          prompt: `Game: ${gameName}
Mechanic: ${mechanic}
Target Network: ${targetNetwork}
Colors: primary=${primaryColor}, secondary=${secondaryColor}
Time limit: ${timeLimit}s

Output a JSON object with these fields:
{
  "hook": "one sentence describing the most compelling moment to show in the ad",
  "tutorialStep": "exact first action player should take in the ad",
  "winCondition": "what happens after a successful action that triggers the CTA",
  "emotionalTrigger": "the feeling the ad should create (curiosity/urgency/satisfaction/etc)",
  "ctaText": "4-6 word button label for the download CTA"
}
Output ONLY the JSON, no explanation.`,
        });

        let brief = { hook: "", tutorialStep: "", winCondition: "", emotionalTrigger: "", ctaText: "Download Now" };
        try {
          const jsonMatch = researchResult.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) brief = { ...brief, ...JSON.parse(jsonMatch[0]) };
        } catch { /* use defaults */ }

        send("\x01AGENT:designer\x02");

        // ── AGENT 2: DESIGNER ──────────────────────────────────────────
        const designResult = await generateText({
          model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
          system: `You are a mobile UI/UX designer specializing in playable ads. Output a precise CSS + layout spec as JSON.`,
          prompt: `Design a playable ad for:
Game: ${gameName}
Hook: ${brief.hook}
Emotional trigger: ${brief.emotionalTrigger}
Primary: ${primaryColor}, Secondary: ${secondaryColor}
${hasTemplate ? "Reference template style: " + (baseTemplateHtml.slice(0, 500)) : "Fresh design"}

Output JSON:
{
  "bgStyle": "CSS background value (gradient or solid)",
  "fontFamily": "font stack",
  "tileStyle": "CSS for number tiles (background, border-radius, box-shadow)",
  "selectedStyle": "CSS for selected tile highlight",
  "flashAnimation": "CSS keyframe name and style for match flash",
  "overlayBg": "CSS for end overlay background",
  "buttonStyle": "CSS for CTA button",
  "layoutNote": "one sentence layout guidance"
}
Output ONLY the JSON.`,
        });

        let design = {
          bgStyle: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor}22)`,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          tileStyle: "background:white; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.15)",
          selectedStyle: `background:${primaryColor}; color:white`,
          flashAnimation: "matchFlash 0.4s ease forwards",
          overlayBg: "rgba(0,0,0,0.9)",
          buttonStyle: `background:${secondaryColor}; color:#000; border-radius:14px; font-weight:700`,
          layoutNote: "centered grid with stats bar on top",
        };
        try {
          const jsonMatch = designResult.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) design = { ...design, ...JSON.parse(jsonMatch[0]) };
        } catch { /* use defaults */ }

        send("\x01AGENT:coder\x02");

        // ── AGENT 3: CODER (streaming) ──────────────────────────────────
        const coderSystem = hasTemplate
          ? `You are an expert HTML5 playable ad developer. Adapt a reference template for a new game using the researcher and designer specs provided.

RULES:
- Output ONLY complete HTML starting with <!DOCTYPE html>. No markdown, no fences.
- Apply the design spec's colors, animations, and styles
- Implement the researcher's hook, tutorial step, win condition, and CTA text
- Keep MRAID CTA: if(typeof mraid!=='undefined') mraid.open(url); else window.open(url,'_blank');
- All assets inlined. Network limit: ${networkLimit}`
          : `You are an expert HTML5 playable ad developer. Build a polished playable ad using the researcher brief and designer spec.

RULES:
- Output ONLY complete HTML starting with <!DOCTYPE html>. No markdown, no fences.
- Apply every CSS value from the design spec exactly
- Implement the researcher's hook, tutorial step, win condition, and CTA text
- MRAID CTA: if(typeof mraid!=='undefined') mraid.open(url); else window.open(url,'_blank');
- Tutorial: bouncing arrow or highlight on first tile for first 2s
- Game completable in ${timeLimit}s
- All assets inlined. Network limit: ${networkLimit}`;

        const coderPrompt = hasTemplate
          ? `RESEARCHER BRIEF:
${JSON.stringify(brief, null, 2)}

DESIGNER SPEC:
${JSON.stringify(design, null, 2)}

REFERENCE TEMPLATE (adapt this):
<reference>
${baseTemplateHtml}
</reference>

Adapt for:
- Game: ${gameName}
- Mechanic: ${mechanic}
- iOS URL: ${iosStoreUrl || "https://apps.apple.com"}
- Android URL: ${androidStoreUrl || "https://play.google.com"}
- Network: ${targetNetwork}

Output the full adapted index.html now:`
          : `RESEARCHER BRIEF:
${JSON.stringify(brief, null, 2)}

DESIGNER SPEC:
${JSON.stringify(design, null, 2)}

BUILD THIS AD:
- Game: ${gameName}
- Mechanic: ${mechanic}
- Colors: primary=${primaryColor}, secondary=${secondaryColor}
- Time: ${timeLimit}s
- iOS URL: ${iosStoreUrl || "https://apps.apple.com"}
- Android URL: ${androidStoreUrl || "https://play.google.com"}
- Network: ${targetNetwork}

Output the full index.html now:`;

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
