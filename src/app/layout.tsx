import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "EzyAds — Playable Ad Builder",
  description: "Build MRAID-compliant HTML5 playable ads for any mobile game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased bg-gray-950 text-white min-h-screen`}>
        <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <span className="font-bold text-xl tracking-tight">EzyAds</span>
            <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full ml-1">Beta</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="/" className="hover:text-white transition-colors">Templates</a>
            <a href="/generate" className="hover:text-white transition-colors text-purple-400 hover:text-purple-300 font-medium">✨ Generate with AI</a>
            <a href="/exports" className="hover:text-white transition-colors">My Exports</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
