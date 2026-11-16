import type { ConnectOptions } from 'mongoose';
import os from 'node:os';

export const mongoTestOptions = {
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 8_000,
  // MongoDB NODE-7832: Jest cannot resolve the driver's dynamic OS import.
  // Supply the real Node adapter; never mock metadata or database responses.
  // https://jira.mongodb.org/browse/NODE-7832
  runtimeAdapters: { os }
} satisfies ConnectOptions;
