import { isolatedFixtureUri } from './mongo-options';

const db = 'bookhaven_test_0123456789abcdef0123456789abcdef';

describe('Isolated MongoDB test fixture safety', () => {
  it('allows generated loopback standalone and replica-set URIs', () => {
    for (const suffix of ['', '?replicaSet=testset']) {
      const uri = 'mongodb://127.0.0.1:27017/' + db + suffix;
      expect(isolatedFixtureUri(uri)).toBe(uri);
    }
  });
  it.each([
    'mongodb://db.example.com:27017/' + db,
    'mongodb+srv://db.example.com/' + db,
    'mongodb://127.0.0.1:27017/bookhaven',
    'mongodb://127.0.0.1:27017/' + db + '?tls=true',
    'mongodb://user:pass@127.0.0.1:27017/' + db,
    'mongodb://127.0.0.1/' + db
  ])('rejects unsafe fixture %s', (uri) => {
    expect(() => isolatedFixtureUri(uri)).toThrow();
  });
});
