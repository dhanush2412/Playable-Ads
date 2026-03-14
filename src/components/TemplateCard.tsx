"use client";

import Link from "next/link";
import { Template } from "@/data/templates";

interface Props {
  template: Template;
}

const HOOK_ICONS: Record<string, string> = {
  "Hand guides valid pairs with zoom": "🔍",
  "Tutorial hand guides first match": "👆",
  "Countdown timer creates urgency": "⏱️",
  "Simple arrow points to first move": "➡️",
  "Animal character reacts to moves": "🐒",
  "Chain reaction on first tap": "💥",
  "Scanning animation before play": "🔍",
};

export default function TemplateCard({ template }: Props) {
  const isReady = !!template.uiHtml;
  const hookIcon = HOOK_ICONS[template.hookStyle] || "🎮";

  return (
    <div className="group relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-purple-500 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10">
      {/* Thumbnail */}
      <div
        className="h-48 relative flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${template.primaryColor}, ${template.secondaryColor}33)` }}
      >
        <div className="text-6xl animate-bounce">{hookIcon}</div>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, ${template.secondaryColor} 0px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, ${template.secondaryColor} 0px, transparent 1px, transparent 20px)`,
          }}
        />
        {!isReady && (
          <div className="absolute top-3 right-3 bg-gray-800/90 text-gray-400 text-xs px-2 py-1 rounded-full border border-gray-700">
            Coming soon
          </div>
        )}
        {isReady && (
          <div className="absolute top-3 right-3 bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/30">
            Ready
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-lg text-white">{template.name}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">{template.theme}</p>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm">{hookIcon}</span>
          <span className="text-xs text-gray-400">{template.hookStyle}</span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 mb-4">{template.description}</p>

        {isReady ? (
          <Link
            href={`/build/${template.id}`}
            className="block w-full text-center bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            Use Template →
          </Link>
        ) : (
          <button
            disabled
            className="block w-full text-center bg-gray-800 text-gray-600 text-sm font-semibold py-2.5 rounded-xl cursor-not-allowed"
          >
            Coming Soon
          </button>
        )}
      </div>
    </div>
  );
}
