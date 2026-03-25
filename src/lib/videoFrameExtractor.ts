/**
 * Extract the last frame of a video using native browser APIs.
 * Uses <video> + <canvas> — no FFmpeg WASM, no special headers needed.
 * Also analyzes dominant colors and layout from pixel data (no AI vision API needed).
 */

export interface FrameAnalysis {
  backgroundColor: string;
  dominantColors: string[];
  width: number;
  height: number;
  aspectRatio: string;
}

export async function extractLastFrame(
  videoFile: File,
  onProgress?: (msg: string) => void
): Promise<{ base64: string; width: number; height: number; analysis: FrameAnalysis }> {
  onProgress?.("Loading video...");

  const videoUrl = URL.createObjectURL(videoFile);

  try {
    const result = await new Promise<{
      base64: string;
      width: number;
      height: number;
      analysis: FrameAnalysis;
    }>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        onProgress?.("Seeking to last frame...");
        video.currentTime = Math.max(0, video.duration - 0.1);
      };

      video.onseeked = () => {
        onProgress?.("Extracting & analyzing frame...");

        // Resize to max 512px width for preview thumbnail
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

        // Analyze pixel data for dominant colors
        const analysis = analyzeFrame(ctx, outW, outH);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        const base64 = dataUrl.split(",")[1];

        resolve({ base64, width: outW, height: outH, analysis });
      };

      video.onerror = () => {
        reject(new Error("Failed to load video. Ensure it is a valid MP4 file."));
      };

      video.src = videoUrl;
    });

    return result;
  } finally {
    URL.revokeObjectURL(videoUrl);
  }
}

/** Extract dominant colors from canvas pixel data */
function analyzeFrame(ctx: CanvasRenderingContext2D, w: number, h: number): FrameAnalysis {
  // Sample background from edges (top-left, top-right, bottom-left, bottom-right corners)
  const edgePixels: number[][] = [];
  const sampleSize = 20;
  for (let x = 0; x < sampleSize; x++) {
    for (let y = 0; y < sampleSize; y++) {
      const p = ctx.getImageData(x, y, 1, 1).data;
      edgePixels.push([p[0], p[1], p[2]]);
    }
    for (let y = h - sampleSize; y < h; y++) {
      const p = ctx.getImageData(x, y, 1, 1).data;
      edgePixels.push([p[0], p[1], p[2]]);
    }
  }
  for (let x = w - sampleSize; x < w; x++) {
    for (let y = 0; y < sampleSize; y++) {
      const p = ctx.getImageData(x, y, 1, 1).data;
      edgePixels.push([p[0], p[1], p[2]]);
    }
  }

  const bgColor = averageColor(edgePixels);

  // Sample center area for dominant content colors
  const centerPixels: number[][] = [];
  const step = 8; // sample every 8th pixel for speed
  const cx1 = Math.floor(w * 0.2), cx2 = Math.floor(w * 0.8);
  const cy1 = Math.floor(h * 0.2), cy2 = Math.floor(h * 0.8);
  for (let x = cx1; x < cx2; x += step) {
    for (let y = cy1; y < cy2; y += step) {
      const p = ctx.getImageData(x, y, 1, 1).data;
      centerPixels.push([p[0], p[1], p[2]]);
    }
  }

  const dominantColors = extractTopColors(centerPixels, 5);

  return {
    backgroundColor: bgColor,
    dominantColors,
    width: w,
    height: h,
    aspectRatio: w > h ? "landscape" : w < h ? "portrait" : "square",
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function averageColor(pixels: number[][]): string {
  if (pixels.length === 0) return "#000000";
  const sum = pixels.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
  return rgbToHex(sum[0] / pixels.length, sum[1] / pixels.length, sum[2] / pixels.length);
}

/** Simple color quantization — bucket similar colors and return top N */
function extractTopColors(pixels: number[][], count: number): string[] {
  const buckets: Record<string, { r: number; g: number; b: number; count: number }> = {};

  for (const [r, g, b] of pixels) {
    // Quantize to 32-level bins to group similar colors
    const qr = Math.round(r / 32) * 32;
    const qg = Math.round(g / 32) * 32;
    const qb = Math.round(b / 32) * 32;
    const key = `${qr},${qg},${qb}`;
    if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, count: 0 };
    buckets[key].r += r;
    buckets[key].g += g;
    buckets[key].b += b;
    buckets[key].count++;
  }

  return Object.values(buckets)
    .sort((a, b) => b.count - a.count)
    .slice(0, count)
    .map(b => rgbToHex(b.r / b.count, b.g / b.count, b.b / b.count));
}
