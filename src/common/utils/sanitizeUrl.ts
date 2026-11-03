const SENSITIVE_PARAMS =
  /^(access_?token|token|password|passwd|secret|api_?key|authorization|auth|session|cookie)$/i;

export function sanitizeUrl(rawUrl: string): string {
  const [path, query] = rawUrl.split('?', 2);
  if (!query) return path;
  const params = new URLSearchParams(query);
  for (const key of [...params.keys()]) {
    if (SENSITIVE_PARAMS.test(key)) params.set(key, '[REDACTED]');
  }
  return `${path}?${params.toString()}`;
}
