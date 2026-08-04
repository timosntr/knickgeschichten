const webpack = require('webpack');
const { VueLoaderPlugin } = require('vue-loader');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: process.env.MODE || 'development',
  entry: './src/loader.js',
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: '[name].[hash:7].js',
    publicPath: '/',
  },
  watchOptions: { poll: true },
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: 'vue-loader',
      },
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'style-loader',
          {
            loader: 'css-loader',
            options: { import: true },
          },
        ],
      },
      {
        test: /favicon\.ico$/,
        loader: 'file-loader',
        options: {
          limit: 1,
          name: '[name].[ext]',
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|svg)$/,
        type: 'asset/inline',
      },
      {
        // Unhashed, stable filename: og:image is a static <meta> URL that
        // crawlers (WhatsApp, etc.) fetch directly, so it can't move on
        // every rebuild the way hashed assets do.
        test: /og-image\.png$/,
        loader: 'file-loader',
        options: {
          limit: 1,
          name: '[name].[ext]',
        },
      },
      {
        test: /\.(png|jpe?g|gif|webp)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name].[hash:7][ext]',
        },
      },
      {
        test: /\.wav$/,
        include: path.resolve(__dirname, 'res'),
        loader: 'file-loader',
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      publicPath: '/',
    }),
    new VueLoaderPlugin(),
  ],
};
