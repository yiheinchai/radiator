const path = require('path');
const radiatorPlugin = path.resolve(__dirname, 'node_modules/@radiator/transform/dist/plugin.js');

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
    '@babel/preset-typescript',
  ],
  plugins: [
    [radiatorPlugin, { captureModule: '@radiator/client' }],
  ],
};
