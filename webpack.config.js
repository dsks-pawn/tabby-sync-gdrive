const path = require('path');
const Dotenv = require('dotenv-webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  target: 'node',
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      'tabby-core': path.resolve(__dirname, 'node_modules/tabby-core'),
      'tabby-settings': path.resolve(__dirname, 'node_modules/tabby-settings'),
    },
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs',
  },
  externals: {
    '@angular/core': 'commonjs @angular/core',
    '@angular/common': 'commonjs @angular/common',
    '@angular/forms': 'commonjs @angular/forms',
    'tabby-core': 'commonjs tabby-core',
    'tabby-settings': 'commonjs tabby-settings',
    electron: 'commonjs electron',
    fs: 'commonjs fs',
    path: 'commonjs path',
    crypto: 'commonjs crypto',
    os: 'commonjs os',
    http: 'commonjs http',
    url: 'commonjs url',
  },
  plugins: [
    new Dotenv(),
    new CopyPlugin({
      patterns: [
        { from: 'package.json', to: '.' },
        { from: 'README.md', to: '.', noErrorOnMissing: true },
      ],
    }),
  ],
};
