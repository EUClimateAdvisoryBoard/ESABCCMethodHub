const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const devCerts = require('office-addin-dev-certs');

const isProduction = process.env.NODE_ENV === 'production';

async function getHttpsOptions() {
  // Use the office-addin-dev-certs package for trusted HTTPS certs
  // This avoids the browser "not trusted" warning
  try {
    const httpsOptions = await devCerts.getHttpsServerOptions();
    return httpsOptions;
  } catch {
    console.warn('Could not get dev certs, falling back to default self-signed');
    return true; // webpack-dev-server will use its own self-signed cert
  }
}

module.exports = async (env, argv) => {
  const httpsOptions = isProduction ? undefined : await getHttpsOptions();

  return {
    entry: {
      taskpane: './src/taskpane/taskpane.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].bundle.js',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/taskpane/taskpane.html',
        filename: 'taskpane.html',
        chunks: ['taskpane'],
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'assets', to: 'assets', noErrorOnMissing: true },
        ],
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      port: 3001,
      server: {
        type: 'https',
        options: httpsOptions || {},
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    devtool: isProduction ? false : 'source-map',
  };
};
