var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
	entry: {
		lib: './vendor.js',
		ui: [
			path.join(__dirname, 'src/ui/index.js'),
			'ngReact/ngReact.js',

			'./style/default.css',
			'./style/effects.css',
			'./style/dhm_profile_camera.css',
		],
	},
	output: {
		path: path.join(__dirname, 'build/public'),
		publicPath: '/',
		filename: 'js/[name].js',
		chunkFilename: '[chunkhash].js',
	},
	devtool: 'eval',
	plugins: [
		new HtmlWebpackPlugin({
			inject: 'head',
			template: path.join(__dirname, 'src/ui/index.html'),
			hash: true,
			chunksSortMode: 'dependency',
		}),
		new ExtractTextPlugin('style/[name].css'),
		new webpack.optimize.DedupePlugin(),
	],
	module: {
		loaders: [
			{test: /\.jsx?$/, exclude: /(node_modules|bower_components)/, loader: 'ng-annotate!babel?cacheDirectory'},
			{test: /\.json$/, loader: 'json'},
			{test: /\.css$/, loader: ExtractTextPlugin.extract('style', 'css')},
		],
	},
	node: {
		fs: 'empty',
	},
};
