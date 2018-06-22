import * as mongoose from 'mongoose';

import { logger } from '../util/logger';

const DB = process.env.MONGO_DB || 'test';
const PORT = process.env.MONGO_PORT || '31017';
const URI = process.env.MONGO_URL || 'mongodb';

export class MongoDust {
  public db: mongoose.Connection;

  constructor() {
  }

  async initialize(): Promise<void> {
    const uri = `mongodb://${URI}:${PORT}/${DB}`;
    try {
      logger.info(`[MongoDust] Creating connection to ${uri}...`);
      await mongoose.connect(uri, { promiseLibrary: require('bluebird') });
      this.db = mongoose.connection;
      logger.info(`[MongoDust] Connected.`);
    } catch (err) {
      logger.error('[MongoDust] Failed to initialize...\n', err);
      throw err;
    }
  }

  async destroy(): Promise<void> {
    try {
      logger.info(`[MongoDust] Closing connection...`);
      this.db.close();
      logger.info(`[MongoDust] Closed.`);
    } catch (err) {
      logger.error('[MongoDust] Failed to destory...\n', err);
    }
  }

}