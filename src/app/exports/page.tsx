"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ExportRecord {
  id: string;
  gameName: string;
  network: string;
  sizeKB: number;
  html: string;
  createdAt: string;
  templateUsed: string;
}

const NETWORK_LABELS: Record<string, string> = {
  meta: "Meta",
  google_uac: "Google UAC",
  applovin: "AppLovin",
  ironsource: "IronSource",
};

const NETWORK_COLORS: Record<string, string> = {
  meta: "bg-blue-600",
  google_uac: "bg-red-600",
  applovin: "bg-orange-600",
  ironsource: "bg-green-700",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ExportsPage() {
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("ezyads_exports");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ExportRecord[];
        parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setExports(parsed);
      } catch {
        setExports([]);
      }
    }
    setLoaded(true);
  }, []);

  const handlePreview = (record: ExportRecord) => {
    const blob = new Blob([record.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handleDownload = (record: ExportRecord) => {
    const blob = new Blob([record.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record.gameName.replace(/\s+/g, "-").toLowerCase() || "playable-ad"}-${record.network}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      const updated = exports.filter((e) => e.id !== id);
      setExports(updated);
      localStorage.setItem("ezyads_exports", JSON.stringify(updated));
      setDeletingId(null);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Exports</h1>
            <p className="text-gray-400 text-sm">Your previously generated playable ads — download, preview, or delete.</p>
          </div>
          {exports.length > 0 && (
            <Link href="/generate" className="inline-block bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap">
              + Generate New
            </Link>
          )}
        </div>

        {!loaded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-gray-800 rounded w-2/3 mb-3" />
                <div className="h-3 bg-gray-800 rounded w-1/3 mb-5" />
                <div className="h-3 bg-gray-800 rounded w-full mb-2" />
                <div className="h-3 bg-gray-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {loaded && exports.length === 0 && (
          <div className="border border-gray-800 rounded-2xl p-16 text-center">
            <p className="text-5xl mb-4">📦</p>
            <p className="text-lg font-semibold mb-2">No exports yet</p>
            <p className="text-gray-400 text-sm mb-8">Generate your first playable ad to see it here.</p>
            <div className="flex justify-center gap-4">
              <Link href="/generate" className="inline-block bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
                Generate with AI
              </Link>
              <Link href="/" className="inline-block bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
                Browse Templates
              </Link>
            </div>
          </div>
        )}

        {loaded && exports.length > 0 && (
          <>
            <p className="text-xs text-gray-500 mb-5">{exports.length} export{exports.length !== 1 ? "s" : ""} — newest first</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {exports.map((record) => (
                <div key={record.id} className={`bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4 transition-opacity ${deletingId === record.id ? "opacity-30" : "opacity-100"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-white truncate">{record.gameName || "Unnamed Ad"}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(record.createdAt)}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg text-white ${NETWORK_COLORS[record.network] ?? "bg-gray-700"}`}>
                      {NETWORK_LABELS[record.network] ?? record.network}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">File size</span>
                      <span className="text-gray-300 font-mono">{record.sizeKB} KB</span>
                    </div>
                    {record.templateUsed && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Template</span>
                        <span className="text-gray-300 truncate max-w-[140px] text-right">
                          {record.templateUsed === "none" ? "From scratch" : record.templateUsed}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => handlePreview(record)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">Preview</button>
                    <button onClick={() => handleDownload(record)} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors">Download</button>
                    <button onClick={() => handleDelete(record.id)} disabled={deletingId === record.id}
                      className="bg-gray-800 hover:bg-red-900/60 border border-transparent hover:border-red-700 text-gray-400 hover:text-red-400 text-xs px-2.5 py-2 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
