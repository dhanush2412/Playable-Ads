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
        onProgress?.("Extracting frame...");
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D context not available"));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get Base64 PNG (strip the data:image/png;base64, prefix)
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];

        resolve({
          base64,
          width: video.videoWidth,
          height: video.videoHeight,
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
