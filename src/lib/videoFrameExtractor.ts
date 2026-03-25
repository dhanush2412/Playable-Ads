/**
 * Extract the last frame of a video using native browser APIs.
 * Uses <video> + <canvas> — no FFmpeg WASM, no special headers needed.
 */

export async function extractLastFrame(
  videoFile: File,
  onProgress?: (msg: string) => void
): Promise<{ base64: string; width: number; height: number }> {
  onProgress?.("Loading video...");

  const videoUrl = URL.createObjectURL(videoFile);

  try {
    const { base64, width, height } = await new Promise<{
      base64: string;
      width: number;
      height: number;
    }>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        onProgress?.("Seeking to last frame...");
        // Seek to 0.1s before end to get the last visible frame
        video.currentTime = Math.max(0, video.duration - 0.1);
      };

      video.onseeked = () => {
        onProgress?.("Extracting & compressing frame...");

        // Resize to max 512px width to keep base64 small for Groq Vision API
        const MAX_WIDTH = 512;
        const scale = video.videoWidth > MAX_WIDTH ? MAX_WIDTH / video.videoWidth : 1;
        const outW = Math.round(video.videoWidth * scale);
        const outH = Math.round(video.videoHeight * scale);

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D context not available"));
          return;
        }
        ctx.drawImage(video, 0, 0, outW, outH);

        // Use JPEG at 80% quality — much smaller than PNG
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        const base64 = dataUrl.split(",")[1];

        resolve({
          base64,
          width: outW,
          height: outH,
        });
      };

      video.onerror = () => {
        reject(new Error("Failed to load video. Ensure it is a valid MP4 file."));
      };

      video.src = videoUrl;
    });

    return { base64, width, height };
  } finally {
    URL.revokeObjectURL(videoUrl);
  }
}
