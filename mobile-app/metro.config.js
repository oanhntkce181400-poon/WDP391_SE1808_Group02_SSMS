const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix Metro cache memory issue
config.cacheStores = [];

// Limit workers to prevent memory issues
config.maxWorkers = 2;

// Watchman config
config.watchman = {
  watch_limit: 10000,
};

// Optimize serialization
config.transformer.minifierPath = require.resolve('metro-minify-terser');
config.transformer.minifierConfig = {
  compress: { drop_console: false },
};

module.exports = config;
