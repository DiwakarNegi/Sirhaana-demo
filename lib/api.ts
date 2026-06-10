export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/v1';

export function keyToUrl(key: string): string {
  return API_BASE + '/media/file/' + encodeURIComponent(key);
}

export interface PresignedUrl {
  key: string;
  url: string;
}

export interface InventoryItem {
  id: string;
  title: string;
  description: string;
  generationStatus: string;
  price: number;
  stock: number;
  images: Array<{ key: string; url: string }>;
  category?: { id: string; name: string };
  brand?: { id: string; name: string };
  createdAt: string;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('capsules_token');
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  return Object.assign(
    { 'Content-Type': 'application/json' },
    token ? { Authorization: 'Bearer ' + token } : {},
    extra
  );
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error('[' + res.status + '] ' + path + ' - ' + text);
  }
  return res.json() as Promise<T>;
}

export async function getUploadUrls(count: number): Promise<PresignedUrl[]> {
  const data = await api<{ data: { urls: PresignedUrl[] } }>('POST', '/media/urls', { count });
  return data.data.urls;
}

export async function uploadFileToS3(file: File, presigned: PresignedUrl): Promise<string> {
  const res = await fetch(presigned.url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/jpeg' },
    body: file,
  });
  if (!res.ok) throw new Error('Upload failed: ' + res.status);
  return presigned.key;
}

export async function uploadImage(file: File): Promise<string> {
  const presignedList = await getUploadUrls(1);
  return uploadFileToS3(file, presignedList[0]);
}

export async function processInventory(payload: {
  imageKeys: string[];
  commerceCategory: 'lifestyle' | 'marketplace';
  supportingText?: string;
  productWidth?: number;
  productLength?: number;
  productDimensionUnit?: 'cm' | 'inch';
}): Promise<{ message: string }> {
  return api('POST', '/ai/process-inventory', payload);
}

export async function getInventory(params?: {
  page?: number;
  perPage?: number;
}): Promise<{ data: InventoryItem[]; meta: Record<string, unknown> }> {
  const qs = new URLSearchParams();
  if (params && params.page) qs.set('page', String(params.page));
  if (params && params.perPage) qs.set('perPage', String(params.perPage));
  const query = qs.toString() ? '?' + qs.toString() : '';
  const res = await api<{ data: { data: InventoryItem[]; meta: Record<string, unknown> } }>('GET', '/inventory' + query);
  return res.data;
}

export async function pollInventoryResult(
  maxWaitMs: number = 300000,
  intervalMs: number = 4000
): Promise<InventoryItem | null> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise<void>(function(r) { setTimeout(r, intervalMs); });
    const result = await getInventory({ page: 1, perPage: 1 });
    const latest = result.data[0];
    if (!latest) continue;
    if (
      latest.generationStatus === 'Image Generation Complete' ||
      latest.generationStatus === 'Generation Failed'
    ) return latest;
  }
  return null;
}

export async function generateCapsule(payload: {
  imageKeys: string[];
  supportingText: string;
}): Promise<{ uuid: string }> {
  const data = await api<{ data: { uuid: string } }>('POST', '/ai/capsules/generate', payload);
  return { uuid: data.data.uuid };
}

export async function getCapsule(uuid: string): Promise<Record<string, unknown>> {
  const data = await api<{ data: Record<string, unknown> }>('GET', '/capsules/' + uuid);
  return data.data;
}

export async function pollCapsule(
  uuid: string,
  maxWaitMs: number = 180000,
  intervalMs: number = 4000
): Promise<Record<string, unknown> | null> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise<void>(function(r) { setTimeout(r, intervalMs); });
    const capsule = await getCapsule(uuid);
    if (capsule.status === 'completed' || capsule.status === 'failed') return capsule;
  }
  return null;
}