import { resolve } from 'path';
import { Configuration as WebpackConfiguration } from 'webpack';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const config: WebpackConfiguration = {
  mode: IS_PRODUCTION ? 'production' : 'development',
  entry: resolve(__dirname, './src/index.ts'),
  output: {
    path: resolve(__dirname, './dist'),
    filename: 'index.js'
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader'
      }
    ]
  }
};

export default config;
