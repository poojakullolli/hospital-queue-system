/**
 * @fileoverview Jest Global Teardown — stops the in-memory MongoDB instance.
 */

module.exports = async () => {
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
    console.log('\n🛑 MongoDB Memory Server stopped.');
  }
};
