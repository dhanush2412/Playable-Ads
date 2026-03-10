import { templates } from "@/data/templates";
import TemplateCard from "@/components/TemplateCard";

export default function GalleryPage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Playable Ad Templates
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Pick a visual template, plug in your game logic, and export a ready-to-upload{" "}
          <code className="text-purple-400 bg-gray-900 px-1.5 py-0.5 rounded text-sm">index.html</code>.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-center gap-8 mb-10 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span>{templates.filter((t) => !!t.uiHtml).length} ready now</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
          <span>{templates.filter((t) => !t.uiHtml).length} coming soon</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🎯</span>
          <span>Meta + Google UAC compliant</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>

      {/* Bottom hint */}
      <p className="text-center text-gray-600 text-sm mt-12">
        More templates added regularly. All ads are MRAID-compliant and under 2MB.
      </p>
    </main>
  );
}
