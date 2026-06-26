/** Empty signature pads still export a small white PNG — require real stroke + minimum payload size. */
const MIN_SIGNATURE_BASE64_LEN = 1200;

export function isBlankSignatureData(base64: string | null | undefined): boolean {
  if (base64 == null) return true;
  const trimmed = base64.trim();
  if (!trimmed || trimmed === "data:image/png;base64,") return true;
  const raw = trimmed.replace(/^data:image\/\w+;base64,/, "");
  return raw.length < MIN_SIGNATURE_BASE64_LEN;
}
