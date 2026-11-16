import { PassThrough, Readable } from "node:stream";
import { describe, expect, test } from "vitest";
import { bufferAudio } from "../../src/music/buffered-stream.ts";

describe("audio read-ahead buffer", () => {
  test("primes before playing and preserves byte order", async () => {
    const source = new PassThrough();
    const { stream, ready } = bufferAudio(source, {
      prebuffer: 4,
      capacity: 8,
    });
    let primed = false;
    void ready.then(() => {
      primed = true;
    });
    source.write(Buffer.from("ab"));
    await new Promise((resolve) => setImmediate(resolve));
    expect(primed).toBe(false);
    source.write(Buffer.from("cd"));
    await ready;
    expect(stream.readableLength).toBe(4);
    source.end(Buffer.from("ef"));
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    expect(Buffer.concat(chunks).toString()).toBe("abcdef");
  });

  test("short tracks below the threshold can still play", async () => {
    const { stream, ready } = bufferAudio(Readable.from([Buffer.from("abc")]));
    await ready;
    expect(stream.read().toString()).toBe("abc");
    stream.destroy();
  });

  test("empty downloads fail instead of starting silent playback", async () => {
    const { stream, ready } = bufferAudio(Readable.from([]));
    await expect(ready).rejects.toThrow("no audio");
    stream.destroy();
  });

  test("download errors reject readiness", async () => {
    const source = new PassThrough();
    const { ready } = bufferAudio(source);
    const assertion = expect(ready).rejects.toThrow("network failed");
    source.destroy(new Error("network failed"));
    await assertion;
  });

  test("cancellation releases the source and rejects pending startup", async () => {
    const source = new PassThrough();
    const { stream, ready } = bufferAudio(source);
    const assertion = expect(ready).rejects.toThrow("cancelled");
    stream.destroy();
    await assertion;
    expect(source.destroyed).toBe(true);
  });

  test("read-ahead applies backpressure instead of downloading without bounds", async () => {
    let produced = 0;
    const source = new Readable({
      highWaterMark: 8,
      read() {
        produced++;
        this.push(Buffer.alloc(8));
      },
    });
    const { stream, ready } = bufferAudio(source, {
      prebuffer: 8,
      capacity: 16,
    });
    await ready;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(produced).toBeLessThanOrEqual(6);
    expect(stream.readableLength).toBeLessThanOrEqual(16);
    stream.destroy();
  });

  test("stalled startup times out and closes the source", async () => {
    const source = new PassThrough();
    const { ready } = bufferAudio(source, { timeoutMs: 10 });
    await expect(ready).rejects.toThrow("Timed out");
    await new Promise((resolve) => setImmediate(resolve));
    expect(source.destroyed).toBe(true);
  });
});
