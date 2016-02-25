var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
	entry: {
		ui: [
			'./vendor.js',

			'./src/ui/index.js',

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
	devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval',
	plugins: [
		new HtmlWebpackPlugin({
			inject: 'head',
			template: path.join(__dirname, 'src/ui/index.html'),
			hash: true,
			chunksSortMode: 'dependency',
		}),
		new ExtractTextPlugin('style/[name].css'),
		new webpack.optimize.DedupePlugin(),
	].concat(process.env.NODE_ENV === 'production' ? [
		new webpack.optimize.UglifyJsPlugin({minimize: true}),
	] : []),
	module: {
		loaders: [
			{test: /\.jsx?$/, exclude: /(node_modules|bower_components)/, loader: 'ng-annotate!babel?cacheDirectory'},
			{test: /\.json$/, loader: 'json'},
			{test: /\.css$/, loader: ExtractTextPlugin.extract('style', 'css')},
			{test: /\.html$/, loader: 'html'},
		],
	},
	node: {
		fs: 'empty',
	},
};
