const path = require('path');

module.exports = [
  // Main process
  {
    entry: './src/main/index.ts',
    target: 'electron-main',
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
        '@main': path.resolve(__dirname, 'src/main'),
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, 'dist/main'),
      clean: true,
    },
    node: {
      __dirname: false,
      __filename: false,
    },
  },
  // Preload script
  {
    entry: './src/preload/index.ts',
    target: 'electron-preload',
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
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, 'dist/preload'),
    },
    node: {
      __dirname: false,
      __filename: false,
    },
  },
];
