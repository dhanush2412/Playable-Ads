"use client";

import { useState, useEffect, useRef } from "react";

const NETWORKS = [
  { id: "meta", label: "Meta (Facebook/Instagram)", limit: "2MB" },
  { id: "google_uac", label: "Google UAC", limit: "5MB" },
  { id: "applovin", label: "AppLovin", limit: "5MB" },
  { id: "ironsource", label: "IronSource", limit: "2MB" },
];

export default function GeneratePage() {
  const [apiKey, setApiKey] = useState("");
  const [gameName, setGameName] = useState("");
  const [iosStoreUrl, setIosStoreUrl] = useState("");
  const [androidStoreUrl, setAndroidStoreUrl] = useState("");
  const [targetNetwork, setTargetNetwork] = useState("meta");
  const [mechanic, setMechanic] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6d28d9");
  const [secondaryColor, setSecondaryColor] = useState("#f1c40f");
  const [timeLimit, setTimeLimit] = useState(20);
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [charCount, setCharCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("groq_api_key");
    if (saved) setApiKey(saved);
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    if (key) localStorage.setItem("groq_api_key", key);
    else localStorage.removeItem("groq_api_key");
  };

  const handleGenerate = async () => {
    if (!apiKey.trim()) { setError("Enter your Groq API key to continue."); return; }
    if (!gameName.trim()) { setError("Enter the game name."); return; }
    if (!mechanic.trim()) { setError("Describe the game mechanic."); return; }

    setError("");
    setGeneratedHtml("");
    setCharCount(0);
    setIsLoading(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, gameName, iosStoreUrl, androidStoreUrl, targetNetwork, mechanic, primaryColor, secondaryColor, timeLimit }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Generation failed.");
        setIsLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let html = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        html += chunk;
        setGeneratedHtml(html);
        setCharCount(html.length);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setError("Connection error. Check your API key and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${gameName.replace(/\s+/g, "-").toLowerCase() || "playable-ad"}-${targetNetwork}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sizeKB = Math.round(new Blob([generatedHtml]).size / 1024);
  const limitKB = targetNetwork === "meta" || targetNetwork === "ironsource" ? 2048 : 5120;
  const sizePercent = Math.min((sizeKB / limitKB) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Generate with AI ✨</h1>
          <p className="text-gray-400">Describe your game and let AI build a complete playable ad in seconds.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left — Form */}
          <div className="space-y-6">
            {/* API Key */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-yellow-400">🔑</span> Groq API Key
              </h2>
              <input
                type="password"
                value={apiKey}
                onChange={e => saveApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 font-mono"
              />
              <p className="text-xs text-gray-500 mt-2">
                Saved locally in your browser. Never sent to our servers.{" "}
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                  Get a free key →
                </a>
              </p>
            </div>

            {/* Game Info */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <h2 className="font-semibold">Game Details</h2>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Game Name</label>
                <input value={gameName} onChange={e => setGameName(e.target.value)}
                  placeholder="e.g. SumLink" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Core Mechanic <span className="text-purple-400">*</span></label>
                <textarea value={mechanic} onChange={e => setMechanic(e.target.value)} rows={3}
                  placeholder="e.g. Tap two numbers on a 4x4 grid that add up to 10 to clear them. Clear all pairs before the timer runs out."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">iOS Store URL</label>
                  <input value={iosStoreUrl} onChange={e => setIosStoreUrl(e.target.value)}
                    placeholder="https://apps.apple.com/..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Android Store URL</label>
                  <input value={androidStoreUrl} onChange={e => setAndroidStoreUrl(e.target.value)}
                    placeholder="https://play.google.com/..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
                </div>
              </div>
            </div>

            {/* Visual + Network */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <h2 className="font-semibold">Visual &amp; Network</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
                    <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
                    <input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Time Limit (seconds)</label>
                  <input type="number" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} min={10} max={60}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Ad Network</label>
                  <select value={targetNetwork} onChange={e => setTargetNetwork(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500">
                    {NETWORKS.map(n => (
                      <option key={n.id} value={n.id}>{n.label} ({n.limit})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>
            )}

            <div className="flex gap-3">
              <button onClick={handleGenerate} disabled={isLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">
                {isLoading ? "Generating..." : "✨ Generate Ad"}
              </button>
              {isLoading && (
                <button onClick={handleStop} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-xl transition-colors text-sm">
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Right — Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Preview</h2>
              {generatedHtml && (
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-400">
                    <span className={sizeKB > limitKB ? "text-red-400" : "text-green-400"}>{sizeKB} KB</span>
                    <span className="text-gray-600"> / {limitKB} KB</span>
                  </div>
                  <button onClick={handleDownload}
                    className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                    Download HTML
                  </button>
                </div>
              )}
            </div>

            {/* Phone mockup */}
            <div className="flex justify-center">
              <div className="relative" style={{ width: 280 }}>
                <div className="bg-gray-800 rounded-[2.5rem] p-3 border border-gray-700 shadow-2xl">
                  <div className="bg-black rounded-[2rem] overflow-hidden" style={{ height: 500 }}>
                    {isLoading && !generatedHtml && (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-500">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs">Generating your ad...</p>
                        <p className="text-xs text-gray-600">{charCount.toLocaleString()} chars</p>
                      </div>
                    )}
                    {generatedHtml && (
                      <iframe
                        srcDoc={generatedHtml}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts"
                        title="Ad Preview"
                      />
                    )}
                    {!isLoading && !generatedHtml && (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-600">
                        <span className="text-4xl">🎮</span>
                        <p className="text-xs">Your ad preview will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Size bar */}
            {generatedHtml && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>File size</span>
                  <span>{sizeKB} / {limitKB} KB</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${sizePercent > 90 ? "bg-red-500" : sizePercent > 70 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${sizePercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
