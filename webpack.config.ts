import { resolve } from 'path';
import { Configuration as WebpackConfiguration } from 'webpack';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const config: WebpackConfiguration = {
  mode: IS_PRODUCTION ? 'production' : 'development',
  entry: resolve(__dirname, './src/index.ts'),
  output: {
    path: resolve(__dirname, './dist'),
    filename: 'index.js'
  },
  target: 'node',
  resolve: {
    plugins: [new TsconfigPathsPlugin()],
    extensions: ['.ts', '.js']
  },
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
