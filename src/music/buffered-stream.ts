import { PassThrough, type Readable } from "node:stream";

/** Download ahead with backpressure, and prime a small reserve before playback. */
export function bufferAudio(
  source: Readable,
  options: { capacity?: number; prebuffer?: number; timeoutMs?: number } = {},
) {
  const capacity = options.capacity ?? 1024 * 1024;
  const prebuffer = options.prebuffer ?? 64 * 1024;
  const stream = new PassThrough({ highWaterMark: capacity });
  // Errors can arrive before the audio resource has installed its listeners.
  stream.on("error", () => {});
  let settled = false;
  let received = 0;
  let finish: (error?: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      source.off("data", onData);
      source.off("end", onEnd);
      stream.off("close", onClose);
      stream.off("error", onError);
      if (error) reject(error);
      else resolve();
    };
    const onData = (chunk: Buffer) => {
      received += chunk.length;
      if (received >= prebuffer) finish();
    };
    const onEnd = () =>
      finish(received ? undefined : new Error("Downloader returned no audio"));
    const onClose = () => finish(new Error("Audio startup cancelled"));
    const onError = (error: Error) => finish(error);
    const timer = setTimeout(() => {
      const error = new Error("Timed out waiting for audio from downloader");
      finish(error);
      stream.destroy(error);
    }, options.timeoutMs ?? 30_000);
    timer.unref();
    source.on("data", onData);
    source.once("end", onEnd);
    stream.once("close", onClose);
    stream.once("error", onError);
  });
  const forwardError = (error: Error) => stream.destroy(error);
  source.on("error", forwardError);
  stream.once("close", () => {
    source.unpipe(stream);
    source.off("error", forwardError);
    source.destroy();
  });
  source.pipe(stream);
  return { stream, ready };
}
