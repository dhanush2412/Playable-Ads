"use client";

import { useState, useRef, useCallback } from "react";
import { extractLastFrame } from "@/lib/videoFrameExtractor";

interface VideoUploaderProps {
  onFrameExtracted: (data: {
    base64: string;
    width: number;
    height: number;
    videoFile: File;
    videoUrl: string;
  }) => void;
  onClear: () => void;
}

export default function VideoUploader({
  onFrameExtracted,
  onClear,
}: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    videoName: string;
    videoSizeMB: string;
    frameDataUrl: string;
    width: number;
    height: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 5 * 1024 * 1024;

  const processVideo = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) {
        setError("Please upload a video file (MP4).");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError(
          `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`
        );
        return;
      }

      setError("");
      setIsExtracting(true);
      setExtractProgress("Loading FFmpeg...");

      try {
        const { base64, width, height } = await extractLastFrame(file, (msg) =>
          setExtractProgress(msg)
        );

        const videoUrl = URL.createObjectURL(file);
        const frameDataUrl = `data:image/png;base64,${base64}`;

        setPreview({
          videoName: file.name,
          videoSizeMB: (file.size / 1024 / 1024).toFixed(1),
          frameDataUrl,
          width,
          height,
        });

        onFrameExtracted({ base64, width, height, videoFile: file, videoUrl });
      } catch (err) {
        setError(
          err instanceof Error
            ? `Frame extraction failed: ${err.message}`
            : "Frame extraction failed."
        );
      } finally {
        setIsExtracting(false);
        setExtractProgress("");
      }
    },
    [onFrameExtracted]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processVideo(file);
    },
    [processVideo]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processVideo(file);
    },
    [processVideo]
  );

  const handleClear = () => {
    setPreview(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  };

  if (preview) {
    return (
      <div className="flex items-start gap-3 bg-gray-800/50 rounded-lg p-3">
        <img
          src={preview.frameDataUrl}
          alt="Last frame"
          className="w-20 h-20 object-cover rounded-lg border border-gray-600"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {preview.videoName}
          </p>
          <p className="text-xs text-gray-400">
            {preview.videoSizeMB} MB &middot; {preview.width}&times;
            {preview.height}
          </p>
          <p className="text-xs text-green-400 mt-1">Last frame extracted</p>
        </div>
        <button
          onClick={handleClear}
          className="text-gray-500 hover:text-red-400 transition-colors text-sm"
          title="Remove video"
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-purple-500 bg-purple-500/10"
            : "border-gray-700 hover:border-gray-500"
        }`}
      >
        {isExtracting ? (
          <div className="space-y-2">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400">{extractProgress}</p>
          </div>
        ) : (
          <>
            <p className="text-2xl mb-1">📁</p>
            <p className="text-sm text-gray-300">
              Drop your lead-in video here
            </p>
            <p className="text-xs text-gray-500 mt-1">MP4 &middot; Max 5MB</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/*"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
