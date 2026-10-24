import assert from 'node:assert/strict';
import { inviteAbsoluteUrl, resolveHouseOrigin, shareOrigin } from '../lib/house-url.ts';

assert.equal(
  resolveHouseOrigin({ PROXYCON_HOUSE_URL: 'https://proxycon.example/' }),
  'https://proxycon.example',
);

assert.equal(
  resolveHouseOrigin({
    NODE_ENV: 'production',
    VERCEL: '1',
    VERCEL_URL: 'proxycon-git-main.vercel.app',
  }),
  'https://proxycon-git-main.vercel.app',
);

assert.equal(
  resolveHouseOrigin({
    NODE_ENV: 'production',
    VERCEL: '1',
    NEXT_PUBLIC_SITE_URL: 'https://proxycon.example',
    VERCEL_URL: 'proxycon-git-preview.vercel.app',
  }),
  'https://proxycon.example',
);

assert.equal(
  resolveHouseOrigin({ NODE_ENV: 'production', VERCEL: '1' }),
  '',
  'hosted without a public URL returns empty so ShareCode uses the browser origin',
);

const previous = process.env.PROXYCON_HOUSE_URL;
process.env.PROXYCON_HOUSE_URL = 'https://house.example';
assert.equal(shareOrigin('http://localhost:3000'), 'https://house.example');
assert.equal(inviteAbsoluteUrl('/invite/ABCD', 'http://localhost:3000'), 'https://house.example/invite/ABCD');
if (previous === undefined) delete process.env.PROXYCON_HOUSE_URL;
else process.env.PROXYCON_HOUSE_URL = previous;

console.log('house-url tests passed');
