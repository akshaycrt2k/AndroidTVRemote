const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const extraNodeModules = require('node-libs-browser'); // Import node-libs-browser to provide polyfills

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      ...extraNodeModules, // Include polyfills for Node.js core modules
      crypto: require.resolve('react-native-crypto'), // Specifically map crypto to react-native-crypto
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
