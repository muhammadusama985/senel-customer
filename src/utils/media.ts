export function getApiOrigin(): string {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
  try {
    const parsed = new URL(baseUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return 'http://localhost:4000';
  }
}

export function resolveMediaUrl(url?: string): string {
  const raw = (url || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const mediaUrl = new URL(raw);
      const apiUrl = new URL(getApiOrigin());
      if (mediaUrl.hostname === 'localhost' || mediaUrl.hostname === '127.0.0.1') {
        mediaUrl.protocol = apiUrl.protocol;
        mediaUrl.hostname = apiUrl.hostname;
        mediaUrl.port = apiUrl.port;
        return mediaUrl.toString();
      }
    } catch {
      return raw;
    }
    return raw;
  }
  if (raw.startsWith('/')) return `${getApiOrigin()}${raw}`;
  return `${getApiOrigin()}/${raw}`;
}
