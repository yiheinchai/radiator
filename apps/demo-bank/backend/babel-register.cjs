require('@babel/register')({
  extensions: ['.ts', '.js'],
  presets: ['@babel/preset-env', '@babel/preset-typescript'],
  plugins: [['@radiator/transform', { captureModule: '@radiator/client' }]],
  ignore: [/node_modules/],
});
