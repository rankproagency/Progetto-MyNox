export function versionedImageUrl(url: string, updatedAt?: string): string {
  if (!url) return url;
  const v = updatedAt ? new Date(updatedAt).getTime() : null;
  return v ? `${url}?v=${v}` : url;
}
