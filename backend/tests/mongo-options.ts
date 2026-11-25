import type { ConnectOptions } from 'mongoose';
import * as os from 'node:os';

export const mongoTestOptions = {
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 8_000,
  // MongoDB NODE-7832: Jest cannot resolve the driver's dynamic OS import.
  // Supply the real Node adapter; never mock metadata or database responses.
  // https://jira.mongodb.org/browse/NODE-7832
  runtimeAdapters: { os }
} satisfies ConnectOptions;


/** Reject external or non-test database URIs before any destructive test cleanup. */
export function isolatedFixtureUri(uri: string): string {
  const parsed = new URL(uri);
  if (parsed.protocol !== 'mongodb:' || parsed.hostname !== '127.0.0.1' || !parsed.port || parsed.username || parsed.password || !/^\/bookhaven_test_[a-f0-9]{32}$/.test(parsed.pathname)) {
    throw new Error('Refusing non-isolated MongoDB test fixture');
  }
  for (const key of parsed.searchParams.keys()) {
    if (key !== 'replicaSet') throw new Error('Unexpected MongoDB test fixture option');
  }
  return uri;
}
