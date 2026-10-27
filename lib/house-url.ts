import os from 'os';

function strip(url: string) {
  return url.replace(/\/$/, '');
}

function withHttps(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

/** Pure origin resolution for invites; exported for tests. */
export function resolveHouseOrigin(env: Partial<NodeJS.ProcessEnv> = process.env, port = env.PORT || '3000'): string {
  const fromEnv = env.PROXYCON_HOUSE_URL?.trim();
  if (fromEnv) return strip(fromEnv);

  const hosted = Boolean(env.VERCEL || env.CF_PAGES || env.NODE_ENV === 'production');
  if (hosted) {
    const site =
      env.NEXT_PUBLIC_SITE_URL?.trim() ||
      env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
      env.VERCEL_URL?.trim();
    if (!site) return '';
    return strip(withHttps(site));
  }

  return lanOrigin(port);
}

function lanOrigin(port: string): string {
  const candidates: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      candidates.push(net.address);
    }
  }

  const house = candidates.find((address) =>
    address.startsWith('192.168.') || address.startsWith('10.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );

  const address = house || candidates[0];
  if (!address) return `http://127.0.0.1:${port}`;
  return `http://${address}:${port}`;
}

/**
 * Origin for invite links and QR codes.
 * Prefer PROXYCON_HOUSE_URL. On hosted deploys without it, use the public site URL
 * and never invent a serverless LAN address phones cannot open.
 */
export function houseOrigin(port = process.env.PORT || '3000'): string {
  return resolveHouseOrigin(process.env, port);
}

/** Share links prefer the configured house/public origin over a localhost browser. */
export function shareOrigin(browserOrigin: string | null | undefined, port?: string): string {
  const house = houseOrigin(port);
  if (house) return house;

  if (browserOrigin) {
    try {
      const url = new URL(browserOrigin);
      if (!isLocalHost(url.hostname)) return strip(browserOrigin);
    } catch {
      // fall through
    }
  }

  return `http://127.0.0.1:${port || process.env.PORT || '3000'}`;
}

export function isLocalOrigin(origin: string): boolean {
  try {
    return isLocalHost(new URL(origin).hostname);
  } catch {
    return true;
  }
}

/** Absolute invite URL for a path, using the configured house/public origin when available. */
export function inviteAbsoluteUrl(path: string, browserOrigin?: string | null, port?: string): string {
  const base = shareOrigin(browserOrigin, port);
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
