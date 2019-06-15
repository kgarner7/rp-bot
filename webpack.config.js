const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: "./frontend/react/index.js",
  externals: {
    "react": "React",
    "react-dom": "ReactDOM"
  },
  mode: "production",
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules|bower_components)/,
        loader: "babel-loader",
        options: { presets: ["@babel/env"] }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  resolve: { extensions: ["*", ".js", ".jsx"] },
  output: {
    path: path.resolve(__dirname, "frontend/scripts/"),
    publicPath: "/frontend/scripts/",
    filename: "bundle.js"
  },
  plugins: [new webpack.HotModuleReplacementPlugin()]
};