const path = require("path");

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
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  resolve: { extensions: ["*", ".js", ".jsx", ".ts", ".tsx"] },
  output: {
    path: path.resolve(__dirname, "frontend/scripts/"),
    publicPath: "/frontend/scripts/",
    filename: "bundle.js"
  }
};