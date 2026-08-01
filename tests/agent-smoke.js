const assert = require('assert');
const agent = require('./../dist/helper/agent').default;

(async () => {
  const cases = [];
  const originalFetch = global.fetch;

  global.fetch = async (url, init) => {
    cases.push({ url: String(url), init });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  await agent('/get_feed_v3?get_unconnected_rooms=true', { query: { foo: 'bar' } });
  assert.strictEqual(cases[0].url, 'https://www.clubhouseapi.com/api/get_feed_v3?get_unconnected_rooms=true&foo=bar');

  await agent('/test', { headers: { Host: 'example.test' } }, { deviceId: 'device-123' });
  const headers = cases[1].init.headers;
  assert.strictEqual(headers.Host, 'example.test');
  assert.strictEqual(headers['CH-DeviceId'], 'device-123');

  await agent('/test', { body: { hello: 'world' }, headers: {} }, { _preventBodySerialization: true });
  assert.strictEqual(cases[2].init.body, undefined);
  assert.strictEqual(cases[2].init.method, undefined);

  console.log('agent smoke tests passed');
  global.fetch = originalFetch;
})();
