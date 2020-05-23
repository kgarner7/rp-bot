const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const path = require("path");
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: "./frontend/react/index.js",
  externals: {
    "dompurify": "DOMPurify",
    "mermaid": "mermaid",
    "react": "React",
    "react-dom": "ReactDOM",
    "showdown": "showdown",
    "socket.io-client": "io",
  },
  mode: "production",
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: [/node_modules/],
        use: [
          "thread-loader", 
          {
            loader: "babel-loader"
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          "style-loader", 
          "css-loader"
        ]
      }
    ]
  },
  resolve: { extensions: ["*", ".js", ".jsx", ".ts", ".tsx"] },
  output: {
    path: path.resolve(__dirname, "frontend/scripts/"),
    publicPath: "/",
    filename: "bundle.js",
    chunkFilename: "[name].[contenthash].js",
  },
  plugins: [
    new CleanWebpackPlugin()
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({})
    ]
  }
};