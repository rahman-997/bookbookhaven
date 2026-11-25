import mongoose from 'mongoose';
import { mongoTestOptions } from './mongo-options';

describe('MongoDB client metadata in the real Jest runtime', () => {
  it('retains required driver and OS metadata before connecting', async () => {
    const client = new mongoose.mongo.MongoClient('mongodb://127.0.0.1:27017/handshake-contract', mongoTestOptions);
    try {
      // Constructor metadata can be checked without a socket or database fixture.
      const metadata = await Reflect.get(client.options, 'metadata');
      expect(metadata).toEqual(expect.objectContaining({
        driver: expect.objectContaining({ name: expect.stringContaining('nodejs'), version: expect.any(String) }),
        os: expect.objectContaining({ type: expect.any(String) })
      }));
    } finally {
      await client.close();
    }
  });
});
