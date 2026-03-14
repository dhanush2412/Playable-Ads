"use client";

import { useState, useEffect, useCallback } from "react";
import { Template } from "@/data/templates";
import { AdConfig, generateAdHtml, getFileSizeKB, NETWORK_LIMITS } from "@/lib/exportAd";
import dynamic from "next/dynamic";
import Link from "next/link";

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

  // Load standalone template file from public/templates/
  useEffect(() => {
    if (isStandalone) {
      fetch(`/templates/${template.templateFile}.html`)
        .then((r) => r.text())
        .then((html) => {
          setPreviewHtml(html);
          setFileSizeKB(getFileSizeKB(html));
        });
    }
  }, [isStandalone, template.templateFile]);

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

  function handleExport() {
    const html = isStandalone ? previewHtml : generateAdHtml(template, config);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.gameName || "playable-ad"}-${config.targetNetwork}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
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
            {exported ? "✓ Downloaded!" : isOverLimit ? "⚠ Export (over limit)" : "Export index.html"}
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
          <div className="relative" style={{ width: 375, height: 667 }}>
            {/* Phone frame */}
            <div className="absolute inset-0 rounded-[40px] border-4 border-gray-700 bg-black overflow-hidden shadow-2xl">
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                  title="Ad Preview"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
                  Loading preview...
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
