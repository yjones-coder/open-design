import { describe, expect, it } from 'vitest';

import { isTrustedConnectorCallbackOrigin } from './EntryView';

describe('connector OAuth callback origin', () => {
  it('accepts the app origin', () => {
    expect(isTrustedConnectorCallbackOrigin('http://127.0.0.1:60809', 'http://127.0.0.1:60809')).toBe(true);
  });

  it('accepts loopback daemon origins on a different port', () => {
    expect(isTrustedConnectorCallbackOrigin('http://127.0.0.1:60807', 'http://127.0.0.1:60809')).toBe(true);
    expect(isTrustedConnectorCallbackOrigin('http://localhost:60807', 'http://127.0.0.1:60809')).toBe(true);
  });

  it('rejects non-loopback origins', () => {
    expect(isTrustedConnectorCallbackOrigin('https://example.com', 'http://127.0.0.1:60809')).toBe(false);
    expect(isTrustedConnectorCallbackOrigin('file://callback', 'http://127.0.0.1:60809')).toBe(false);
  });
});
