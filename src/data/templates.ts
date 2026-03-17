export interface Template {
  id: string;
  name: string;
  theme: string;
  hookStyle: string;
  primaryColor: string;
  secondaryColor: string;
  description: string;
  uiHtml: string;
  hookJs: string;
  logicSlotJs: string;
  comingSoon?: boolean;
  templateFile?: string;
}

export const templates: Template[] = [
  {
    id: "sumlink-playable",
    name: "Sum Link — Playable",
    theme: "Clean White Grid",
    hookStyle: "Hand guides valid pairs with zoom",
    primaryColor: "#ffffff",
    secondaryColor: "#2860d0",
    description:
      "Production-ready Sum Link playable ad. 7-column number grid with auto-zoom that follows the hint hand. Players tap pairs that match or sum to 10. Blue sparkle effects, emoji decorations on cleared cells, green/pink feedback pills, and a polished end card with CTA. MRAID-compliant, under 15KB.",
    uiHtml: "<!-- sumlink_playable -->",
    hookJs: "",
    logicSlotJs: `function isMatch(val1, val2) {
  return val1 === val2 || val1 + val2 === 10;
}`,
    comingSoon: false,
    templateFile: "sumlink_playable",
  },
  {
    id: "sumlink-autodemo-v1",
    name: "Sum Link — Auto Demo (IQ Hook)",
    theme: "Newspaper × Auto-Play",
    hookStyle: "Govt IQ narrative → game plays itself",
    primaryColor: "#ffffff",
    secondaryColor: "#1a1a2e",
    description:
      "Non-interactive auto-demo. Opens with newspaper story: 'Govt Identifies High-IQ Citizens Through Number Challenge'. Game plays itself — hand auto-selects pairs with zoom, sparkles, and pills. No user interaction needed. Ideal for video-style ad placements.",
    uiHtml: "<!-- sumlink_autodemo_v1 -->",
    hookJs: "",
    logicSlotJs: `function isMatch(val1, val2) {
  return val1 === val2 || val1 + val2 === 10;
}`,
    comingSoon: false,
    templateFile: "sumlink_autodemo_v1",
  },
  {
    id: "sumlink-autodemo-v2",
    name: "Sum Link — Newspaper Reader (Auto)",
    theme: "Govt IQ Newspaper × Auto-Play",
    hookStyle: "Newspaper pans to grid → game plays itself",
    primaryColor: "#f5f0e0",
    secondaryColor: "#1a1a2e",
    description:
      "Full newspaper reading experience. Shows 'The Daily Times' with Govt IQ screening story, auto-pans to the puzzle grid, then game plays itself. Zero interaction needed. Designed for video-style ad placements.",
    uiHtml: "<!-- sumlink_autodemo_v2 -->",
    hookJs: "",
    logicSlotJs: `function isMatch(val1, val2) {
  return val1 === val2 || val1 + val2 === 10;
}`,
    comingSoon: false,
    templateFile: "sumlink_autodemo_v2",
  },
  {
    id: "sumlink-autodemo-v3",
    name: "Sum Link — Newspaper + Voice (Auto)",
    theme: "Govt IQ × Voice Narration × Auto-Play",
    hookStyle: "Zoom to article → voice narrates → game plays itself",
    primaryColor: "#f5f0e0",
    secondaryColor: "#1a1a2e",
    description:
      "Full cinematic newspaper ad. Shows headline, zooms into the puzzle gamer article with highlighted text, plays AI voice narration, then pans to grid and auto-plays the game. Zero interaction needed.",
    uiHtml: "<!-- sumlink_autodemo_v3 -->",
    hookJs: "",
    logicSlotJs: `function isMatch(val1, val2) {
  return val1 === val2 || val1 + val2 === 10;
}`,
    comingSoon: false,
    templateFile: "sumlink_autodemo_v3",
  },
  {
    id: "wizard-sumlink",
    name: "Wizard SumLink",
    theme: "Dark Purple Magic",
    hookStyle: "Tutorial hand guides first match",
    primaryColor: "#3d246c",
    secondaryColor: "#f1c40f",
    description:
      "A magical wizard character floats above a number grid. Tutorial hand guides the player to their first match, then unlocks free play. Wizard celebrates each match with sparkle particles.",
    uiHtml: `<!-- Top Banner & Character -->
<div id="top-area">
  <div id="character">🧙‍♂️</div>
  <div id="dialogue">{{DIALOGUE_TEXT}}</div>
</div>
<div id="board-area">
  <div id="board-bg">
    <div id="grid"></div>
    <div id="highlight"></div>
  </div>
</div>
<div id="bottom-area">
  <button id="cta-btn" onclick="openStore()">PLAY FREE</button>
</div>
<div id="tutorial-hand">👆</div>
<div id="end-overlay">
  <div id="end-char">🧙‍♂️</div>
  <div id="end-text">MAGICAL!<br><span style="font-size:24px;color:white;text-shadow:none;font-weight:600;">Can you solve the rest?</span></div>
  <button id="cta-btn" onclick="openStore()" style="animation:none;transform:scale(1.1);">INSTALL NOW</button>
</div>`,
    hookJs: `// Tutorial hook - guides player to first match
let handTargetIndex = 0;
let tutorialMoves = [
  { r: 0, c: 0 },
  { r: 0, c: 1 }
];
function setupTutorial() {
  let target = tutorialMoves[handTargetIndex];
  let r = target.r, c = target.c;
  const hl = document.getElementById('highlight');
  hl.style.left = (c * TILE_SIZE + 10 - 6) + 'px';
  hl.style.top = (r * TILE_SIZE + 10 - 6) + 'px';
  hl.style.opacity = 0.8;
  const hand = document.getElementById('tutorial-hand');
  let br = boardBg.getBoundingClientRect();
  hand.style.left = (br.left + c * TILE_SIZE + 15) + 'px';
  hand.style.top = (br.top + r * TILE_SIZE + 30) + 'px';
  hand.style.opacity = 1;
}
function advanceTutorial() {
  handTargetIndex++;
  if (handTargetIndex >= tutorialMoves.length) {
    document.getElementById('highlight').style.display = 'none';
    document.getElementById('tutorial-hand').style.display = 'none';
    state = 'playing';
  } else { setupTutorial(); }
}`,
    logicSlotJs: `// Your game logic goes here.
// Called when two gems are selected.
// Return true if they are a valid match, false otherwise.
function isMatch(val1, val2) {
  return val1 === val2 || val1 + val2 === 10;
}`,
  },
  {
    id: "neon-arcade",
    name: "Neon Arcade",
    theme: "Black + Neon Glow",
    hookStyle: "Countdown timer creates urgency",
    primaryColor: "#0a0a0a",
    secondaryColor: "#00ff88",
    description:
      "Dark background with neon glowing tiles. A countdown timer creates urgency. Numbers pulse with neon glow on hover. Fast-paced arcade feel.",
    uiHtml: "<!-- neon_arcade -->",
    hookJs: "",
    logicSlotJs: `function isMatch(val1, val2) {
  return val1 === val2 || val1 + val2 === 10;
}`,
    comingSoon: false,
    templateFile: "neon_arcade",
  },
  {
    id: "minimal-clean",
    name: "Minimal Clean",
    theme: "White + Pastel",
    hookStyle: "Simple arrow points to first move",
    primaryColor: "#ffffff",
    secondaryColor: "#6366f1",
    description:
      "Clean white background with soft pastel number tiles. A gentle arrow guides the first move. Minimal animations, maximum clarity.",
    uiHtml: "<!-- minimal_clean -->",
    hookJs: "",
    logicSlotJs: `function isMatch(val1, val2) {
  return val1 === val2 || val1 + val2 === 10;
}`,
    comingSoon: false,
    templateFile: "minimal_clean",
  },
  {
    id: "jungle-adventure",
    name: "Jungle Adventure",
    theme: "Green Canopy",
    hookStyle: "Animal character reacts to moves",
    primaryColor: "#1a4d2e",
    secondaryColor: "#fbbf24",
    description:
      "Lush green jungle background with a monkey character that reacts to your matches. Leaves shake on successful matches. Vine-wrapped number tiles.",
    uiHtml: "",
    hookJs: "",
    logicSlotJs: `function isMatch(val1, val2) {
  return val1 === val2 || val1 + val2 === 10;
}`,
  },
  {
    id: "candy-blast",
    name: "Candy Blast",
    theme: "Bright Candy Colors",
    hookStyle: "Chain reaction on first tap",
    primaryColor: "#ff6b9d",
    secondaryColor: "#ffd93d",
    description:
      "Bright, candy-colored tiles on a sweet-themed background. First tap triggers a satisfying cascade. Sugar explosion particles on matches.",
    uiHtml: "",
    hookJs: "",
    logicSlotJs: `function isMatch(val1, val2) {
  return val1 === val2 || val1 + val2 === 10;
}`,
  },
  {
    id: "scifi-grid",
    name: "Sci-Fi Grid",
    theme: "Dark Blue Holographic",
    hookStyle: "Scanning animation before play",
    primaryColor: "#0c1222",
    secondaryColor: "#00d4ff",
    description:
      "Futuristic holographic grid with scanning line animation on load. Numbers appear as digital readouts. Glitch effect on matches.",
    uiHtml: "",
    hookJs: "",
    logicSlotJs: `function isMatch(val1, val2) {
  return val1 === val2 || val1 + val2 === 10;
}`,
  },
];

export function getTemplateById(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}
