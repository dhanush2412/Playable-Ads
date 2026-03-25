import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

export async function loadFFmpeg(
  onProgress?: (msg: string) => void
): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on("log", ({ message }) => {
    onProgress?.(message);
  });

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

export async function extractLastFrame(
  videoFile: File,
  onProgress?: (msg: string) => void
): Promise<{ base64: string; width: number; height: number }> {
  const ff = await loadFFmpeg(onProgress);

  const videoData = await fetchFile(videoFile);
  await ff.writeFile("input.mp4", videoData);

  // Use -sseof to seek from end, extract 1 frame
  await ff.exec([
    "-sseof",
    "-0.1",
    "-i",
    "input.mp4",
    "-frames:v",
    "1",
    "-q:v",
    "2",
    "lastframe.png",
  ]);

  const frameData = await ff.readFile("lastframe.png");
  const blob = new Blob([new Uint8Array(frameData as Uint8Array)], { type: "image/png" });

  const imageBitmap = await createImageBitmap(blob);
  const width = imageBitmap.width;
  const height = imageBitmap.height;
  imageBitmap.close();

  const base64 = await blobToBase64(blob);

  await ff.deleteFile("input.mp4");
  await ff.deleteFile("lastframe.png");

  return { base64, width, height };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
