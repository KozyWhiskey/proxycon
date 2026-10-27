/** Only same-origin, ordinary app paths may cross an identity boundary. */
export function safeNext(value: unknown, fallback = '/') {
    if (typeof value !== 'string')
        return fallback;
    try {
        const decoded = decodeURIComponent(value);
        if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\r\n\u0000]/.test(decoded))
            return fallback;
        const url = new URL(value, 'https://proxycon.invalid');
        return url.origin === 'https://proxycon.invalid' ? url.pathname + url.search + url.hash : fallback;
    }
    catch {
        return fallback;
    }
}
