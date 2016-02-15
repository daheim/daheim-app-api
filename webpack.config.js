var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var ngAnnotatePlugin = require('ng-annotate-webpack-plugin');

module.exports = {
	entry: {
		lib: [
			'babel-polyfill',
			'jquery/dist/jquery.js',
			'angular/angular.js',
			'angular-aria/angular-aria.js',
			'angular-animate/angular-animate.js',
			'angular-material/angular-material.js',
			'angular-route/angular-route.js',
			'angular-resource/angular-resource.js',
			'angulartics/src/angulartics.js',
			'angulartics-google-analytics/lib/angulartics-google-analytics.js',

			'angular-material/angular-material.css',
		],
		ui: [
			path.join(__dirname, 'src/ui/index.js'),

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
	devtool: 'source-map',
	plugins: [
		new HtmlWebpackPlugin({
			inject: 'head',
			template: path.join(__dirname, 'src/ui/index.html'),
			hash: true,
			chunksSortMode: 'dependency',
		}),
		new ExtractTextPlugin('style/[name].css'),
		new ngAnnotatePlugin({add: true, singleQuotes: true}),
	],
	module: {
		loaders: [
			{test: /\.json$/, loader: 'json'},
			{test: /\.jsx?$/, exclude: /(node_modules|bower_components)/, loader: 'babel'},
			{test: /\.css$/, loader: ExtractTextPlugin.extract("style-loader", "css-loader")}
		],
	},
	node: {
	  fs: 'empty',
	},
};
