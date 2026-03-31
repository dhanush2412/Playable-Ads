"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Template } from "@/data/templates";
import { AdConfig, generateAdHtml, getFileSizeKB, NETWORK_LIMITS } from "@/lib/exportAd";
import dynamic from "next/dynamic";
import Link from "next/link";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const DEFAULT_CONFIG: AdConfig = {
  gameName: "",
  iosStoreUrl: "",
  androidStoreUrl: "",
  targetNetwork: "meta",
  primaryColor: "",
  secondaryColor: "",
  matchRule: "Match numbers that sum to 10!",
  winCondition: "Clear all matching pairs",
  gridSize: "4x4",
  timeLimit: 20,
  customLogic: "",
};

interface Props {
  template: Template;
}

export default function AdBuilder({ template }: Props) {
  const isStandalone = !!template.templateFile;
  const hasVideoUpload = !!template.hasVideoUpload;

  const [config, setConfig] = useState<AdConfig>({
    ...DEFAULT_CONFIG,
    primaryColor: template.primaryColor,
    secondaryColor: template.secondaryColor,
    gameName: template.name,
    customLogic: template.logicSlotJs,
  });
  const [previewHtml, setPreviewHtml] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [fileSizeKB, setFileSizeKB] = useState(0);
  const [exported, setExported] = useState(false);
  const [merging, setMerging] = useState(false);
  const [exporting2, setExporting2] = useState<"idle" | "recording" | "merging">("idle");
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const phoneFrameRef = useRef<HTMLDivElement>(null);

  // Video upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState("");
  const [videoEnded, setVideoEnded] = useState(false);
  const [playMode, setPlayMode] = useState<"interactive" | "autoplay">("interactive");
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [rawHtml, setRawHtml] = useState("");

  // Load standalone template file from public/templates/
  useEffect(() => {
    if (isStandalone) {
      fetch(`/templates/${template.templateFile}.html`)
        .then((r) => r.text())
        .then((html) => {
          setRawHtml(html);
          setFileSizeKB(getFileSizeKB(html));
        });
    }
  }, [isStandalone, template.templateFile]);

  // Re-inject skip-intro + play mode script whenever rawHtml or playMode changes
  useEffect(() => {
    if (!isStandalone || !rawHtml) return;
    if (hasVideoUpload) {
      // Auto play waits for postMessage from parent (sent when video ends)
      const skipIntro = `<script>document.addEventListener('DOMContentLoaded',function(){var intro=document.getElementById('intro');if(intro)intro.classList.add('done');var gc=document.getElementById('gc');if(gc)gc.classList.add('show');setTimeout(function(){if(typeof window._startGame==='function')window._startGame();},50);});window.addEventListener('message',function(e){if(e.data==='ezyads:startAutoPlay'){if(window._unlockAudio)window._unlockAudio();if(typeof window._autoPlay==='function')window._autoPlay();}});<\/script>`;
      setPreviewHtml(rawHtml.replace("</body>", skipIntro + "</body>"));
    } else {
      setPreviewHtml(rawHtml);
    }
  }, [rawHtml, hasVideoUpload, isStandalone]);

  // When video ends in preview, notify iframe to start auto play (skip during Export 2 recording)
  useEffect(() => {
    if (videoEnded && playMode === "autoplay" && iframeRef.current?.contentWindow && exporting2 === "idle") {
      iframeRef.current.contentWindow.postMessage("ezyads:startAutoPlay", "*");
    }
  }, [videoEnded, playMode, exporting2]);

  const updatePreview = useCallback(() => {
    if (isStandalone) return; // standalone templates load from file
    const html = generateAdHtml(template, config);
    setPreviewHtml(html);
    setFileSizeKB(getFileSizeKB(html));
  }, [template, config, isStandalone]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  function handleChange(field: keyof AdConfig, value: string | number) {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }

  // Stop recording when game ends
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data === "ezyads:gameEnded" && recorderRef.current?.state === "recording") {
        setTimeout(() => {
          recorderRef.current?.stop();
          setRecording(false);
        }, 1500); // capture end card before stopping
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function handleRecord() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" } as MediaTrackConstraints,
        audio: true,
        selfBrowserSurface: "include",
        preferCurrentTab: true,
      } as unknown as DisplayMediaStreamOptions);

      // Try Region Capture to crop to phone preview only
      if ("CropTarget" in window && phoneFrameRef.current) {
        try {
          const cropTarget = await (window as any).CropTarget.fromElement(phoneFrameRef.current);
          const [videoTrack] = stream.getVideoTracks();
          await (videoTrack as any).cropTo(cropTarget);
        } catch { /* Region Capture unsupported — records full tab */ }
      }

      recordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        saveAs(blob, `${config.gameName || "game-demo"}-recording.webm`);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(100);
      recorderRef.current = recorder;
      setRecording(true);

      // Auto-start the preview playback
      if (hasVideoUpload && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
        setVideoEnded(false);
      } else if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage("ezyads:startAutoPlay", "*");
      }
    } catch {
      // User cancelled or permission denied
    }
  }

  function handleStopRecord() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function handleExport() {
    if (hasVideoUpload && videoFile) {
      // Inline game HTML into index.html — no iframe, no separate HTML file
      // Facebook flags iframe src as "dynamic asset loading" even for local files

      // Extract <head> and <body> content from game HTML
      const headContent = rawHtml.substring(
        rawHtml.indexOf('>', rawHtml.indexOf('<head')) + 1,
        rawHtml.indexOf('</head>')
      );
      const bodyContent = rawHtml.substring(
        rawHtml.indexOf('>', rawHtml.indexOf('<body')) + 1,
        rawHtml.lastIndexOf('</body>')
      );

      const autoCall = playMode === "autoplay"
        ? "if(typeof window._autoPlay==='function')window._autoPlay();"
        : "";

      // Fetch bundled game demo video (auto-play recording)
      const gameDemoResp = await fetch('/game_demo.mp4');
      const gameDemoArrayBuffer = await gameDemoResp.arrayBuffer();

      // Concatenate user video + game demo using FFmpeg.wasm
      // Re-encode both to 1080x1920 so any input resolution works
      setMerging(true);
      let combinedVideoBlob: Blob;
      try {
        const ffmpeg = new FFmpeg();
        await ffmpeg.load();
        await ffmpeg.writeFile("v1.mp4", await fetchFile(videoFile));
        await ffmpeg.writeFile("v2.mp4", new Uint8Array(gameDemoArrayBuffer));
        const scaleFilter = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,setpts=PTS-STARTPTS";
        const audioFilter = `[0:a]asetpts=PTS-STARTPTS[a0];[1:a]asetpts=PTS-STARTPTS[a1];[a0][a1]concat=n=2:v=0:a=1[oa]`;
        // Try with audio from both inputs
        let ret = await ffmpeg.exec([
          "-i", "v1.mp4", "-i", "v2.mp4",
          "-filter_complex",
          `[0:v]${scaleFilter}[v0];[1:v]${scaleFilter}[v1];[v0][v1]concat=n=2:v=1:a=0[ov];${audioFilter}`,
          "-map", "[ov]", "-map", "[oa]",
          "-c:v", "libx264", "-crf", "18", "-preset", "ultrafast",
          "-c:a", "aac", "output.mp4"
        ]);
        if (ret !== 0) {
          // Fallback: only user video audio (game demo may have no audio stream)
          await ffmpeg.deleteFile("output.mp4").catch(() => {});
          await ffmpeg.exec([
            "-i", "v1.mp4", "-i", "v2.mp4",
            "-filter_complex",
            `[0:v]${scaleFilter}[v0];[1:v]${scaleFilter}[v1];[v0][v1]concat=n=2:v=1:a=0[ov]`,
            "-map", "[ov]", "-map", "0:a?",
            "-c:v", "libx264", "-crf", "18", "-preset", "ultrafast",
            "-c:a", "aac", "output.mp4"
          ]);
        }
        const data = await ffmpeg.readFile("output.mp4");
        const buffer = (data as Uint8Array).buffer as ArrayBuffer;
        combinedVideoBlob = new Blob([buffer], { type: "video/mp4" });
      } finally {
        setMerging(false);
      }

      const inlinedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <title>${config.gameName || "Playable Ad"}</title>
  <style>
    #vl{position:fixed;inset:0;z-index:9999;transition:opacity .5s ease}
    #vl video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  </style>
  ${headContent}
</head>
<body>
  <div id="vl">
    <video autoplay playsinline onended="go()" onplay="if(window._unlockAudio)window._unlockAudio();" ontouchstart="if(window._unlockAudio)window._unlockAudio();">
      <source src="./video.mp4" type="video/mp4">
    </video>
  </div>
  ${bodyContent}
  <script>
    // Unlock audio on any first interaction with the page
    function _tryUnlock(){if(window._unlockAudio)window._unlockAudio();}
    document.addEventListener('touchstart',_tryUnlock,{once:true});
    document.addEventListener('click',_tryUnlock,{once:true});
    // Hide newspaper intro immediately, start game
    document.addEventListener('DOMContentLoaded',function(){
      var intro=document.getElementById('intro');
      if(intro)intro.classList.add('done');
      var gc=document.getElementById('gc');
      if(gc)gc.classList.add('show');
      setTimeout(function(){if(typeof window._startGame==='function')window._startGame();},50);
    });
    // Combined video ends → fade out overlay, start interactive game
    function go(){
      var v=document.getElementById('vl');
      v.style.opacity='0';
      setTimeout(function(){v.style.display='none'},500);
      ${autoCall}
    }
    // Facebook Ads compliance
    function openStore(){
      if(typeof FbPlayableAd!=='undefined'){FbPlayableAd.onCTAClick();}
      else if(typeof mraid!=='undefined'){mraid.open('${config.androidStoreUrl || "https://play.google.com/store/apps/details?id=com.ezygamers.sumlinknumbergame&hl=en_IN"}');}
      else{window.open('${config.androidStoreUrl || "https://play.google.com/store/apps/details?id=com.ezygamers.sumlinknumbergame&hl=en_IN"}','_blank');}
    }
  <\/script>
</body>
</html>`;

      const zip = new JSZip();
      zip.file("index.html", inlinedHtml);
      zip.file("video.mp4", combinedVideoBlob);
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `${config.gameName || "playable-ad"}-video-playable.zip`);
    } else {
      const html = isStandalone ? previewHtml : generateAdHtml(template, config);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "index.html";
      a.click();
      URL.revokeObjectURL(url);
    }
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  }

  // Export 2: screen-record the live auto-play game, then concat with user video via FFmpeg
  async function handleExport2() {
    if (!videoFile || exporting2 !== "idle") return;
    setExporting2("recording");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
        selfBrowserSurface: "include",
        preferCurrentTab: true,
      } as unknown as DisplayMediaStreamOptions);

      if ("CropTarget" in window && phoneFrameRef.current) {
        try {
          const cropTarget = await (window as any).CropTarget.fromElement(phoneFrameRef.current);
          const [videoTrack] = stream.getVideoTracks();
          await (videoTrack as any).cropTo(cropTarget);
        } catch { /* Region Capture unsupported — records full tab */ }
      }

      const chunks: Blob[] = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.start(100);

      // Trigger auto-play in iframe
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage("ezyads:startAutoPlay", "*");
      }

      // Wait for game to end, then stop (60s fallback if game never sends gameEnded)
      const gameBlob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(chunks, { type: "video/webm" }));
        };
        function onMsg(e: MessageEvent) {
          if (e.data === "ezyads:gameEnded") {
            window.removeEventListener("message", onMsg);
            clearTimeout(fallback);
            setTimeout(() => recorder.stop(), 1500);
          }
        }
        const fallback = setTimeout(() => {
          window.removeEventListener("message", onMsg);
          recorder.stop();
        }, 60000);
        window.addEventListener("message", onMsg);
      });

      setExporting2("merging");

      // FFmpeg: user video (v1) + screen recording (v2) → combined mp4
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      await ffmpeg.writeFile("v1.mp4", await fetchFile(videoFile));
      await ffmpeg.writeFile("v2.webm", await fetchFile(gameBlob));
      const scaleFilter = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,setpts=PTS-STARTPTS";
      const audioFilter = `[0:a]asetpts=PTS-STARTPTS[a0];[1:a]asetpts=PTS-STARTPTS[a1];[a0][a1]concat=n=2:v=0:a=1[oa]`;
      let ret = await ffmpeg.exec([
        "-i", "v1.mp4", "-i", "v2.webm",
        "-filter_complex",
        `[0:v]${scaleFilter}[v0];[1:v]${scaleFilter}[v1];[v0][v1]concat=n=2:v=1:a=0[ov];${audioFilter}`,
        "-map", "[ov]", "-map", "[oa]",
        "-c:v", "libx264", "-crf", "18", "-preset", "ultrafast",
        "-c:a", "aac", "output.mp4"
      ]);
      if (ret !== 0) {
        await ffmpeg.deleteFile("output.mp4").catch(() => {});
        await ffmpeg.exec([
          "-i", "v1.mp4", "-i", "v2.webm",
          "-filter_complex",
          `[0:v]${scaleFilter}[v0];[1:v]${scaleFilter}[v1];[v0][v1]concat=n=2:v=1:a=0[ov]`,
          "-map", "[ov]", "-map", "0:a?",
          "-c:v", "libx264", "-crf", "18", "-preset", "ultrafast",
          "-c:a", "aac", "output.mp4"
        ]);
      }
      const data = await ffmpeg.readFile("output.mp4");
      const buffer = (data as Uint8Array).buffer as ArrayBuffer;
      const combinedVideoBlob = new Blob([buffer], { type: "video/mp4" });

      // Build index.html (same structure as Export)
      const headContent = rawHtml.substring(
        rawHtml.indexOf('>', rawHtml.indexOf('<head')) + 1,
        rawHtml.indexOf('</head>')
      );
      const bodyContent = rawHtml.substring(
        rawHtml.indexOf('>', rawHtml.indexOf('<body')) + 1,
        rawHtml.lastIndexOf('</body>')
      );
      const autoCall = playMode === "autoplay"
        ? "if(typeof window._autoPlay==='function')window._autoPlay();"
        : "";
      const inlinedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <title>${config.gameName || "Playable Ad"}</title>
  <style>
    #vl{position:fixed;inset:0;z-index:9999;transition:opacity .5s ease}
    #vl video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  </style>
  ${headContent}
</head>
<body>
  <div id="vl">
    <video autoplay playsinline onended="go()" onplay="if(window._unlockAudio)window._unlockAudio();" ontouchstart="if(window._unlockAudio)window._unlockAudio();">
      <source src="./video.mp4" type="video/mp4">
    </video>
  </div>
  ${bodyContent}
  <script>
    function _tryUnlock(){if(window._unlockAudio)window._unlockAudio();}
    document.addEventListener('touchstart',_tryUnlock,{once:true});
    document.addEventListener('click',_tryUnlock,{once:true});
    document.addEventListener('DOMContentLoaded',function(){
      var intro=document.getElementById('intro');
      if(intro)intro.classList.add('done');
      var gc=document.getElementById('gc');
      if(gc)gc.classList.add('show');
      setTimeout(function(){if(typeof window._startGame==='function')window._startGame();},50);
    });
    function go(){
      var v=document.getElementById('vl');
      v.style.opacity='0';
      setTimeout(function(){v.style.display='none'},500);
      ${autoCall}
    }
    function openStore(){
      if(typeof FbPlayableAd!=='undefined'){FbPlayableAd.onCTAClick();}
      else if(typeof mraid!=='undefined'){mraid.open('${config.androidStoreUrl || "https://play.google.com/store/apps/details?id=com.ezygamers.sumlinknumbergame&hl=en_IN"}');}
      else{window.open('${config.androidStoreUrl || "https://play.google.com/store/apps/details?id=com.ezygamers.sumlinknumbergame&hl=en_IN"}','_blank');}
    }
  <\/script>
</body>
</html>`;

      const zip = new JSZip();
      zip.file("index.html", inlinedHtml);
      zip.file("video.mp4", combinedVideoBlob);
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `${config.gameName || "playable-ad"}-live-export.zip`);
    } catch {
      // User cancelled or permission denied
    } finally {
      setExporting2("idle");
    }
  }

  function handleVideoUpload(file: File) {
    if (!file.type.startsWith("video/")) return;
    if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoObjectUrl(url);
    setVideoEnded(false);
  }

  function handleVideoClear() {
    if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
    setVideoFile(null);
    setVideoObjectUrl("");
    setVideoEnded(false);
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  const limit = NETWORK_LIMITS[config.targetNetwork];
  const isOverLimit = fileSizeKB * 1024 > limit.maxBytes;
  const sizePercent = Math.min(100, (fileSizeKB * 1024 / limit.maxBytes) * 100);

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center justify-between bg-gray-950">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white transition-colors text-sm">← Templates</Link>
          <span className="text-gray-700">/</span>
          <span className="text-white font-semibold">{template.name}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* File size indicator */}
          <div className="flex items-center gap-2 text-xs">
            <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isOverLimit ? "bg-red-500" : "bg-green-500"}`}
                style={{ width: `${sizePercent}%` }}
              />
            </div>
            <span className={isOverLimit ? "text-red-400" : "text-gray-400"}>
              {fileSizeKB.toFixed(1)}KB / {(limit.maxBytes / 1024).toFixed(0)}KB
            </span>
          </div>
          {/* Network selector */}
          <select
            value={config.targetNetwork}
            onChange={(e) => handleChange("targetNetwork", e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-xs px-3 py-1.5 rounded-lg"
          >
            <option value="meta">Meta (2MB)</option>
            <option value="google_uac">Google UAC (5MB)</option>
            <option value="applovin">AppLovin (5MB)</option>
            <option value="ironsource">IronSource (2MB)</option>
          </select>
          {hasVideoUpload && videoFile && (
            <button
              onClick={handleExport2}
              disabled={exporting2 !== "idle"}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                exporting2 !== "idle"
                  ? "bg-orange-600 text-white cursor-wait"
                  : "bg-orange-600 hover:bg-orange-500 text-white"
              }`}
            >
              {exporting2 === "recording" ? "⏺ Recording game..." : exporting2 === "merging" ? "Merging..." : "Export 2 (Live)"}
            </button>
          )}
          {hasVideoUpload && (
            <button
              onClick={recording ? handleStopRecord : handleRecord}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                recording
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
            >
              {recording ? "⏹ Stop" : "⏺ Record"}
            </button>
          )}
          <button
            onClick={handleExport}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              exported
                ? "bg-green-600 text-white"
                : isOverLimit
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-purple-600 hover:bg-purple-500 text-white"
            }`}
          >
            {merging ? "Merging videos..." : exported ? "✓ Downloaded!" : isOverLimit ? "⚠ Export (over limit)" : hasVideoUpload && videoFile ? "Export ZIP" : "Export index.html"}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-80 border-r border-gray-800 overflow-y-auto bg-gray-950 flex-shrink-0">
          <div className="p-5 space-y-5">
            {isStandalone ? (
              <>
                <Section title="About This Ad">
                  <p className="text-sm text-gray-300 leading-relaxed">{template.description}</p>
                </Section>

                {hasVideoUpload && (
                  <Section title="Play Mode">
                    <div className="flex rounded-lg overflow-hidden border border-gray-700">
                      <button
                        onClick={() => setPlayMode("interactive")}
                        className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                          playMode === "interactive"
                            ? "bg-purple-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:text-white"
                        }`}
                      >
                        Interactive
                      </button>
                      <button
                        onClick={() => setPlayMode("autoplay")}
                        className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                          playMode === "autoplay"
                            ? "bg-purple-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:text-white"
                        }`}
                      >
                        Auto Play
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {playMode === "autoplay"
                        ? "Game plays itself — ideal for screen recording"
                        : "User taps to play — standard playable ad"}
                    </p>
                  </Section>
                )}

                {hasVideoUpload && (
                  <Section title="Lead-in Video">
                    {videoFile ? (
                      <div className="bg-gray-900 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-white font-medium truncate max-w-[160px]">{videoFile.name}</p>
                            <p className="text-xs text-gray-400">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                          </div>
                          <button
                            onClick={handleVideoClear}
                            className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none"
                          >
                            &times;
                          </button>
                        </div>
                        <p className="text-xs text-green-400">Video ready — export as ZIP</p>
                      </div>
                    ) : (
                      <div
                        onClick={() => videoInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-700 hover:border-purple-500 rounded-xl p-5 text-center cursor-pointer transition-colors"
                      >
                        <p className="text-2xl mb-1">🎬</p>
                        <p className="text-sm text-gray-300">Drop or click to upload video</p>
                        <p className="text-xs text-gray-500 mt-1">MP4 · Any size</p>
                      </div>
                    )}
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleVideoUpload(f);
                      }}
                    />
                  </Section>
                )}

                <Section title="Ad Specs">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-900 rounded-lg p-3">
                      <div className="text-gray-500 mb-1">Size</div>
                      <div className="text-white font-semibold">{fileSizeKB.toFixed(1)} KB</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3">
                      <div className="text-gray-500 mb-1">Format</div>
                      <div className="text-white font-semibold">Single HTML</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3">
                      <div className="text-gray-500 mb-1">MRAID</div>
                      <div className="text-green-400 font-semibold">Compliant</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3">
                      <div className="text-gray-500 mb-1">CTA Target</div>
                      <div className="text-white font-semibold">Play Store</div>
                    </div>
                  </div>
                </Section>

                <Section title="Compatible Networks">
                  <div className="space-y-2 text-xs">
                    {Object.entries(NETWORK_LIMITS).map(([key, val]) => {
                      const ok = fileSizeKB * 1024 <= val.maxBytes;
                      return (
                        <div key={key} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
                          <span className="text-gray-300 capitalize">{key.replace("_", " ")}</span>
                          <span className={ok ? "text-green-400" : "text-red-400"}>{ok ? "OK" : "Over limit"}</span>
                        </div>
                      );
                    })}
                  </div>
                </Section>


              </>
            ) : (
              <>
                <Section title="Game Info">
                  <Field label="Game Name">
                    <Input value={config.gameName} onChange={(v) => handleChange("gameName", v)} placeholder="SumLink" />
                  </Field>
                  <Field label="Android Store URL">
                    <Input value={config.androidStoreUrl} onChange={(v) => handleChange("androidStoreUrl", v)} placeholder="https://play.google.com/..." />
                  </Field>
                  <Field label="iOS Store URL">
                    <Input value={config.iosStoreUrl} onChange={(v) => handleChange("iosStoreUrl", v)} placeholder="https://apps.apple.com/..." />
                  </Field>
                </Section>

                <Section title="Visual Theme">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Primary Color">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => handleChange("primaryColor", e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-700 bg-transparent"
                        />
                        <span className="text-xs text-gray-400 font-mono">{config.primaryColor}</span>
                      </div>
                    </Field>
                    <Field label="Accent Color">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.secondaryColor}
                          onChange={(e) => handleChange("secondaryColor", e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-700 bg-transparent"
                        />
                        <span className="text-xs text-gray-400 font-mono">{config.secondaryColor}</span>
                      </div>
                    </Field>
                  </div>
                </Section>

                <Section title="Game Logic">
                  <Field label="Match Rule (shown to player)">
                    <Input value={config.matchRule} onChange={(v) => handleChange("matchRule", v)} placeholder="Match numbers to 10!" />
                  </Field>
                  <Field label="Win Condition">
                    <Input value={config.winCondition} onChange={(v) => handleChange("winCondition", v)} placeholder="Clear all pairs" />
                  </Field>
                  <Field label="Time Limit (seconds)">
                    <input
                      type="number"
                      value={config.timeLimit}
                      onChange={(e) => handleChange("timeLimit", Number(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg"
                      min={5} max={60}
                    />
                  </Field>
                </Section>

                {/* Code editor toggle */}
                <div>
                  <button
                    onClick={() => setShowEditor(!showEditor)}
                    className="w-full text-left flex items-center justify-between text-sm font-semibold text-gray-300 hover:text-white py-2 border-t border-gray-800 transition-colors"
                  >
                    <span>Advanced: Game Logic Code</span>
                    <span className="text-gray-600">{showEditor ? "▲" : "▼"}</span>
                  </button>
                  {showEditor && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-gray-700">
                      <MonacoEditor
                        height="220px"
                        language="javascript"
                        theme="vs-dark"
                        value={config.customLogic}
                        onChange={(v) => handleChange("customLogic", v || "")}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 12,
                          lineNumbers: "off",
                          scrollBeyondLastLine: false,
                          wordWrap: "on",
                          padding: { top: 8, bottom: 8 },
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right panel: Live preview */}
        <div className="flex-1 bg-gray-900 flex flex-col items-center justify-center p-6">
          <p className="text-gray-600 text-xs mb-4 uppercase tracking-widest">Live Preview</p>
          <div className="relative" style={{ width: 340, height: 720 }}>
            {/* Phone frame */}
            <div ref={phoneFrameRef} className="absolute inset-0 rounded-[40px] border-4 border-gray-700 bg-black overflow-hidden shadow-2xl">
              {/* Video overlay (only for video+playable template) */}
              {hasVideoUpload && videoObjectUrl && (
                <video
                  ref={videoRef}
                  src={videoObjectUrl}
                  className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-500 ${
                    videoEnded || exporting2 === "recording" ? "opacity-0 pointer-events-none" : "opacity-100"
                  }`}
                  autoPlay
                  muted
                  playsInline
                  onEnded={() => setVideoEnded(true)}
                  onClick={() => {
                    if (videoRef.current?.muted) { videoRef.current.muted = false; return; }
                    if (videoRef.current?.paused) videoRef.current.play();
                    else videoRef.current?.pause();
                  }}
                />
              )}
              {previewHtml ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  title="Ad Preview"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
                  Loading preview...
                </div>
              )}
              {/* Prompt to upload video */}
              {hasVideoUpload && !videoObjectUrl && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
                  <div className="text-center">
                    <p className="text-3xl mb-2">🎬</p>
                    <p className="text-white text-sm font-medium">Upload a video</p>
                    <p className="text-gray-400 text-xs mt-1">to preview the transition</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-gray-700 text-xs mt-4">375 × 667 — iPhone SE</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg placeholder-gray-600 focus:outline-none focus:border-purple-500"
    />
  );
}
