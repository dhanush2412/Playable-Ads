import { Template } from "@/data/templates";

export interface AdConfig {
  gameName: string;
  iosStoreUrl: string;
  androidStoreUrl: string;
  targetNetwork: "meta" | "google_uac" | "applovin" | "ironsource";
  primaryColor: string;
  secondaryColor: string;
  matchRule: string;
  winCondition: string;
  gridSize: string;
  timeLimit: number;
  customLogic: string;
}

export const NETWORK_LIMITS: Record<string, { maxBytes: number; format: string }> = {
  meta: { maxBytes: 2 * 1024 * 1024, format: "zip" },
  google_uac: { maxBytes: 5 * 1024 * 1024, format: "zip" },
  applovin: { maxBytes: 5 * 1024 * 1024, format: "zip" },
  ironsource: { maxBytes: 2 * 1024 * 1024, format: "single_html" },
};

export function generateAdHtml(template: Template, config: AdConfig): string {
  const storeUrl = config.androidStoreUrl || config.iosStoreUrl || "#";

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,maximum-scale=1"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;touch-action:none}
body{background:${config.primaryColor};overflow:hidden;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif}
#game-container{position:relative;width:100vw;height:100vh;max-width:500px;margin:0 auto;background:linear-gradient(135deg,${config.primaryColor} 0%,${config.secondaryColor}33 100%);overflow:hidden}
#top-area{position:absolute;top:0;left:0;width:100%;height:25%;display:flex;align-items:center;justify-content:center;z-index:10;padding:10px}
#character{font-size:80px;filter:drop-shadow(0 5px 15px rgba(0,0,0,0.5));animation:float 3s ease-in-out infinite;z-index:12;line-height:1}
#dialogue{background:white;padding:15px 20px;border-radius:20px;text-align:center;color:#333;font-weight:800;font-size:18px;margin-left:-10px;position:relative;z-index:11;box-shadow:0 4px 10px rgba(0,0,0,0.3);border:4px solid ${config.secondaryColor};transform:rotate(2deg);width:60%}
#dialogue::before{content:'';position:absolute;left:-15px;top:50%;transform:translateY(-50%);border-width:15px 20px 15px 0;border-style:solid;border-color:transparent white transparent transparent}
@keyframes float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-15px) rotate(3deg)}}
@keyframes celebrate{0%{transform:scale(1) translateY(0)}20%{transform:scale(1.2) translateY(-20px) rotate(-10deg)}40%{transform:scale(1.2) translateY(-20px) rotate(10deg)}60%{transform:scale(1.2) translateY(-20px) rotate(-10deg)}80%{transform:scale(1.2) translateY(-20px) rotate(10deg)}100%{transform:scale(1) translateY(0) rotate(0)}}
#board-area{position:absolute;top:25%;left:0;width:100%;height:55%;display:flex;align-items:center;justify-content:center;z-index:5}
#board-bg{background:rgba(0,0,0,0.3);padding:10px;border-radius:15px;border:3px solid ${config.secondaryColor}66;box-shadow:inset 0 0 20px rgba(0,0,0,0.8);position:relative}
#grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;position:relative}
.slot{width:60px;height:60px;background:rgba(255,255,255,0.1);border-radius:10px}
.gem{position:absolute;width:60px;height:60px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:bold;color:${config.primaryColor};text-shadow:1px 1px 2px rgba(255,255,255,0.5);background:linear-gradient(135deg,#e0c3fc 0%,#8ec5fc 100%);border-radius:10px;box-shadow:0 4px 8px rgba(0,0,0,0.4),inset 0 2px 4px rgba(255,255,255,0.7);cursor:pointer;transition:transform 0.2s,top 0.3s ease,left 0.3s ease,filter 0.2s,box-shadow 0.2s;user-select:none}
.gem.selected{transform:scale(1.1);box-shadow:0 0 15px ${config.secondaryColor},inset 0 2px 4px rgba(255,255,255,0.7);filter:brightness(1.2);border:2px solid ${config.secondaryColor}}
.gem.matched{transform:scale(0);opacity:0;transition:transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275),opacity 0.3s}
#tutorial-hand{position:absolute;font-size:50px;z-index:100;pointer-events:none;filter:drop-shadow(0 5px 5px rgba(0,0,0,0.5));animation:tapPulse 1.5s ease-in-out infinite;opacity:0}
@keyframes tapPulse{0%{transform:translateY(0) scale(1.2) rotate(-10deg);opacity:0}20%{transform:translateY(0) scale(1) rotate(0);opacity:1;filter:drop-shadow(0 0 15px ${config.secondaryColor})}70%{transform:translateY(0) scale(1) rotate(0);opacity:1;filter:drop-shadow(0 0 15px ${config.secondaryColor})}100%{transform:translateY(20px) scale(0.8);opacity:0}}
#highlight{position:absolute;width:72px;height:72px;border:4px solid ${config.secondaryColor};border-radius:14px;z-index:20;box-shadow:0 0 15px ${config.secondaryColor},inset 0 0 10px ${config.secondaryColor};pointer-events:none;opacity:0;animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
#bottom-area{position:absolute;bottom:0;left:0;width:100%;height:20%;display:flex;align-items:center;justify-content:center;z-index:10}
#cta-btn{background:linear-gradient(to bottom,${config.secondaryColor},${config.secondaryColor}cc);color:#fff;border:3px solid #fff;padding:15px 40px;font-size:26px;font-weight:900;border-radius:40px;text-transform:uppercase;box-shadow:0 10px 20px rgba(0,0,0,0.5),inset 0 -3px 0 rgba(0,0,0,0.2);animation:ctaPulse 1.5s infinite;cursor:pointer;text-shadow:1px 2px 2px rgba(0,0,0,0.4)}
@keyframes ctaPulse{0%{transform:scale(1)}50%{transform:scale(1.08);box-shadow:0 15px 25px rgba(0,0,0,0.6),inset 0 -3px 0 rgba(0,0,0,0.2)}100%{transform:scale(1)}}
.particle{position:absolute;pointer-events:none;font-size:20px;z-index:50;animation:fadeUp 1s forwards}
@keyframes fadeUp{0%{transform:translateY(0) scale(1);opacity:1;filter:hue-rotate(0)}100%{transform:translateY(-80px) scale(0.2);opacity:0;filter:hue-rotate(90deg)}}
#end-overlay{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:200;display:none;flex-direction:column;align-items:center;justify-content:center}
#end-text{font-size:50px;font-weight:900;color:${config.secondaryColor};text-shadow:0 4px 10px rgba(0,0,0,1),0 0 20px ${config.secondaryColor};text-transform:uppercase;margin-bottom:30px;animation:popIn 0.8s cubic-bezier(0.175,0.885,0.32,1.275);text-align:center}
#end-char{font-size:120px;animation:float 2s infinite;filter:drop-shadow(0 0 30px ${config.secondaryColor});margin-bottom:20px}
@keyframes popIn{0%{transform:scale(0) rotate(-10deg)}70%{transform:scale(1.1) rotate(5deg)}100%{transform:scale(1) rotate(0)}}
</style>
</head>
<body>
<div id="game-container">
${template.uiHtml.replace("{{DIALOGUE_TEXT}}", config.matchRule || "Match numbers to 10!")}
</div>
<script>
var STORE_URL='${storeUrl}';
function openStore(){if(typeof mraid!=='undefined'){if(mraid.getState()==='loading')mraid.addEventListener('ready',function(){mraid.open(STORE_URL)});else mraid.open(STORE_URL)}else{window.open(STORE_URL,'_blank')}}
var COLS=4,ROWS=4,TILE_SIZE=66;
var INITIAL_GRID=[[5,5,2,8],[1,9,3,7],[4,6,5,5],[8,2,1,9]];
var board=[],gridEl=document.getElementById('grid'),boardBg=document.getElementById('board-bg'),gemIdCounter=0,selectedGem=null,matchesMade=0,state='tutorial';

${config.customLogic || template.logicSlotJs}

${template.hookJs}

function init(){for(var r=0;r<ROWS;r++){board[r]=[];for(var c=0;c<COLS;c++){var slot=document.createElement('div');slot.className='slot';gridEl.appendChild(slot);var val=INITIAL_GRID[r][c];board[r][c]=createGem(r,c,val)}}setupTutorial()}
function createGem(r,c,val){var gem=document.createElement('div');gem.className='gem';gem.innerText=val;gem.dataset.val=val;gem.id='gem_'+(gemIdCounter++);setPosition(gem,r,c);boardBg.appendChild(gem);return{el:gem,val:val,r:r,c:c}}
function setPosition(gemEl,r,c){gemEl.style.left=(c*TILE_SIZE+10)+'px';gemEl.style.top=(r*TILE_SIZE+10)+'px'}
gridEl.parentElement.addEventListener('pointerdown',function(e){if(state==='animating'||state==='win')return;var br=boardBg.getBoundingClientRect();var x=e.clientX-br.left-10;var y=e.clientY-br.top-10;var c=Math.floor(x/TILE_SIZE);var r=Math.floor(y/TILE_SIZE);if(c>=0&&c<COLS&&r>=0&&r<ROWS&&board[r][c]){if(state==='tutorial'){var t=tutorialMoves[handTargetIndex];if(r!==t.r||c!==t.c)return}handleGemSelect(r,c)}});
function handleGemSelect(r,c){var gem=board[r][c];if(!selectedGem){selectedGem=gem;gem.el.classList.add('selected');if(state==='tutorial')advanceTutorial()}else{if(selectedGem.r===r&&selectedGem.c===c){selectedGem.el.classList.remove('selected');selectedGem=null}else{var val1=selectedGem.val,val2=gem.val;if(isMatch(val1,val2)){state='animating';selectedGem.el.classList.add('matched');gem.el.classList.add('matched');createParticles(selectedGem.r,selectedGem.c);createParticles(gem.r,gem.c);var ch=document.getElementById('character');ch.style.animation='none';void ch.offsetWidth;ch.style.animation='celebrate 1s ease-in-out';var praises=["Magical!","Brilliant!","Excellent!"];document.getElementById('dialogue').innerText=praises[matchesMade%praises.length];board[selectedGem.r][selectedGem.c]=null;board[gem.r][gem.c]=null;var sg=selectedGem;setTimeout(function(){sg.el.remove();gem.el.remove();selectedGem=null;matchesMade++;if(matchesMade>=2)winGame();else state='playing'},400);if(state==='tutorial'){document.getElementById('highlight').style.display='none';document.getElementById('tutorial-hand').style.display='none';state='playing'}}else{gem.el.style.transform="translateX(-5px)";setTimeout(function(){gem.el.style.transform="translateX(5px)"},50);setTimeout(function(){gem.el.style.transform="translateX(0)"},100);selectedGem.el.classList.remove('selected');selectedGem=null}}}}
function createParticles(r,c){for(var i=0;i<5;i++){var p=document.createElement('div');p.className='particle';p.innerText=['✨','🌟','💫'][Math.floor(Math.random()*3)];p.style.left=(c*TILE_SIZE+10+20+Math.random()*20-10)+'px';p.style.top=(r*TILE_SIZE+10+20+Math.random()*20-10)+'px';boardBg.appendChild(p);setTimeout(function(el){el.remove()},1000,p)}}
var wons=false;function winGame(){if(wons)return;wons=true;state='win';setTimeout(function(){document.getElementById('end-overlay').style.display='flex'},500)}
init();
</script>
</body>
</html>`;
}

export function getFileSizeKB(html: string): number {
  return new Blob([html]).size / 1024;
}
