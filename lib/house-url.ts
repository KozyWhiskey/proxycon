import os from 'os';

function strip(url: string) {
  return url.replace(/\/$/, '');
}

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

/** IPv4 address a phone on the house network can open. */
export function houseOrigin(port = process.env.PORT || '3000'): string {
  const fromEnv = process.env.PROXYCON_HOUSE_URL;
  if (fromEnv) return strip(fromEnv);

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

/** Share links stay on the house address when this browser is on localhost. */
export function shareOrigin(browserOrigin: string | null | undefined, port?: string): string {
  if (browserOrigin) {
    try {
      const url = new URL(browserOrigin);
      if (!isLocalHost(url.hostname)) return strip(browserOrigin);
    } catch {
      // fall through to the house address
    }
  }
  return houseOrigin(port);
}

export function isLocalOrigin(origin: string): boolean {
  try {
    return isLocalHost(new URL(origin).hostname);
  } catch {
    return true;
  }
}
