export type QuickUploadType = {
  type: string;
  slug: string;
  label?: string | number;
  label_id?: number;
  label_name?: string;
  status?: string | number;
  status_id?: number;
  status_name?: string;
  relaties_id?: number;
  expire_date_required?: boolean;
  min_photos?: number;
  allow_camera?: boolean;
  show_on_mobile?: boolean;
};

export type RelatieDocument = {
  id: number | string;
  filename?: string;
  type?: string;
  short_description?: string;
  expire_date?: string | null;
  status_id?: number;
  status_name?: string;
  label_id?: number;
  label_name?: string;
  shared_link?: string;
  side?: "front" | "back" | string;
  file_extension?: string;
  file_type?: "image" | "pdf" | string;
  quick_upload?: number;
};

export type PickedDocumentFile = {
  uri: string;
  name: string;
  type: string;
};

export function buildTypeSubtitle(item: QuickUploadType) {
  const parts: string[] = [];
  const minPhotos = resolveMinPhotos(item);
  if (minPhotos > 0) {
    parts.push(
      minPhotos === 1
        ? "At least 1 photo"
        : `At least ${minPhotos} photos`,
    );
  }
  if (item.expire_date_required) {
    parts.push("Expiry date required");
  }
  return parts.join(" · ") || "Upload document photo";
}

/** NIWO / passport (and API min_photos=1) → single photo upload. */
export function isSinglePhotoDocumentType(
  item: Pick<QuickUploadType, "type" | "slug" | "min_photos"> | null | undefined,
): boolean {
  if (!item) return false;
  if (Number(item.min_photos) === 1) return true;
  const key = `${item.slug || ""} ${item.type || ""}`.toLowerCase();
  return (
    key.includes("niwo") ||
    key.includes("passport") ||
    key.includes("paspoort")
  );
}

export function resolveMinPhotos(
  item: Pick<QuickUploadType, "type" | "slug" | "min_photos"> | null | undefined,
): number {
  if (isSinglePhotoDocumentType(item)) return 1;
  const n = Number(item?.min_photos);
  if (Number.isFinite(n) && n > 0) return Math.max(1, Math.floor(n));
  return 2;
}

export function resolveDocumentFileType(doc: RelatieDocument | null | undefined) {
  const explicit = String(doc?.file_type || "").toLowerCase();
  if (explicit === "image" || explicit === "pdf") return explicit;

  const ext = String(doc?.file_extension || "")
    .toLowerCase()
    .replace(/^\./, "");
  if (["jpg", "jpeg", "png", "webp", "gif", "heic", "bmp"].includes(ext)) {
    return "image";
  }
  if (ext === "pdf") return "pdf";
  return explicit || "file";
}
