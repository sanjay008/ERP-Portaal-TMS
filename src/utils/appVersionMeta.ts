import { getApiBaseUrl } from '@/src/utils/apiBaseUrl';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

export function getActiveApiShortName(): string {
  const url = getApiBaseUrl().toLowerCase();
  if (url.includes('gesutms.nl') || url.includes('gesu')) {
    return 'Gesu';
  }
  if (url.includes('app.erpportaal.nl')) {
    return 'App';
  }
  return 'App';
}

function shortOtaId(id?: string | null): string | null {
  if (!id) return null;
  const raw = String(id).replace(/^urn:uuid:/i, '').trim();
  if (!raw) return null;
  return raw.split('-')[0].slice(0, 8) || null;
}

export function resolveOtaId(): string {
  const manifest = Updates.manifest as { id?: string } | undefined;
  const constantsManifest = (Constants as { manifest2?: { id?: string } }).manifest2;
  const id =
    Updates.updateId ||
    manifest?.id ||
    constantsManifest?.id ||
    null;
  return shortOtaId(id) ?? 'embedded';
}

export function getOtaVersionLine(): string {
  return `OTA ${resolveOtaId()} - ${getActiveApiShortName()}`;
}
