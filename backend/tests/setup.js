/**
 * @fileoverview Jest Global Setup — starts an in-memory MongoDB instance
 * for the entire test suite.
 *
 * This file is referenced in package.json jest.globalSetup.
 * It downloads (and caches) a MongoDB binary on first run.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

module.exports = async () => {
  console.log('\n🔧 Starting in-memory MongoDB...');
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  // Store instance reference so globalTeardown can stop it
  global.__MONGOD__ = mongod;
  console.log(`✅ MongoDB Memory Server started: ${uri}`);
};
