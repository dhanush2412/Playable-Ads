import Link from "next/link";

export default function ExportsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-2">My Exports</h1>
      <p className="text-gray-400 text-sm mb-8">Your previously generated playable ads will appear here.</p>
      <div className="border border-gray-800 rounded-2xl p-12 text-center">
        <p className="text-4xl mb-4">📦</p>
        <p className="text-gray-400 mb-6">No exports yet.</p>
        <Link
          href="/"
          className="inline-block bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          Browse Templates →
        </Link>
      </div>
    </main>
  );
}
