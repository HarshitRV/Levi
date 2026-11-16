export function formatDuration(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return "LIVE";
  const sec = Math.floor(totalSec % 60);
  const min = Math.floor((totalSec / 60) % 60);
  const hr = Math.floor(totalSec / 3600);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hr > 0 ? `${hr}:${pad(min)}:${pad(sec)}` : `${min}:${pad(sec)}`;
}

export function truncate(str: string, max = 80): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

export function progressBar(
  current: number,
  total: number,
  width = 20,
): string {
  if (!Number.isFinite(total) || total <= 0) return "🔴 LIVE";
  const ratio = Math.max(0, Math.min(1, current / total));
  const pos = Math.round(ratio * (width - 1));
  let bar = "";
  for (let i = 0; i < width; i++) bar += i === pos ? "🔘" : "▬";
  return bar;
}
