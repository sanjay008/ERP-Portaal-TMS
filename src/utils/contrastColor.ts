const cache = new Map<string, string>();

function parseRgb(color: string): [number, number, number] | null {
  const value = String(color || "").trim();
  if (!value) return null;

  if (value.startsWith("rgb")) {
    const parts = value.match(/\d+(\.\d+)?/g);
    if (!parts || parts.length < 3) return null;
    return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
  }

  let hex = value.startsWith("#") ? value.slice(1) : value;
  if (/^[0-9a-f]+$/i.test(hex)) {
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    } else if (hex.length === 8) {
      hex = hex.slice(0, 6);
    }
    if (hex.length === 6) {
      return [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
      ];
    }
  }

  return null;
}

/** Dark bg → #FFFFFF; light bg → #000000. Cached. */
export function getContrastColor(
  background?: string | null,
  fallback: string = "#000000",
): string {
  const key = String(background || "").trim().toLowerCase();
  if (!key) return fallback;

  const cached = cache.get(key);
  if (cached) return cached;

  const rgb = parseRgb(key);
  if (!rgb) {
    cache.set(key, fallback);
    return fallback;
  }

  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const contrast = luminance < 0.6 ? "#FFFFFF" : "#000000";
  cache.set(key, contrast);
  return contrast;
}
