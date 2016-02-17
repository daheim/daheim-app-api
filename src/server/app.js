import './optional_newrelic';
import './bootstrap';

import path from 'path';
import passport from 'passport';
import express from 'express';
import Azure from './azure';
import User from './user';
import UserStore from './user_store';
import tokenHandler from './token_handler';
import Realtime from './realtime';
import config from './config';
import bodyParser from 'body-parser';
import log from './log';
import api from './api';
//import {User as ModelUser} from './model';


import createDebug from 'debug';
let debug = createDebug('dhm:app');
debug('starting server');

var app = express();
var server = require('http').Server(app);

let azure = Azure.createFromEnv();

app.use(log.requestLogger());
app.enable('trust proxy');
app.disable('x-powered-by');
app.use(bodyParser.json({limit: '1mb'}));

let userStore = new UserStore({azure});
let user = new User({userStore, tokenHandler, passport});

let realtime = new Realtime({log, tokenHandler, userStore, config});
realtime.listen(server);

app.use(passport.initialize());
app.use('/users', user.router);
app.use('/api', api.router);

app.get('/js/config.js', function(req, res) {
	var cfg = {
		socketIoUrl: 'http://localhost:3000',
		storageAccount: azure.blobs.storageAccount
	};
	res.send('angular.module("dhm").constant("config", ' + JSON.stringify(cfg) + ');');
});


if (process.env.NODE_ENV === 'development') {
	let webpackDevMiddleware = require('webpack-dev-middleware');
	let webpack = require('webpack');

	let compiler = webpack(require('../../../../webpack.config.js'));
	let webpackmw = webpackDevMiddleware(compiler, {
		stats: {
			colors: true,
		},
	});

	app.use(webpackmw);
	app.get('*', function(req, res, next) {
		req.url = '/';
		webpackmw(req, res, next);
	});
}

app.use(express.static(__dirname + '/../../../../build/public'));
app.use(express.static(__dirname + '/../../../../public'));
app.get('*', function(req, res) {
	req.url = '/';
	res.sendFile(path.resolve(__dirname + '/../../../../build/public/index.html'));
});

// log errors
app.use(log.errorLogger());

// error handler
app.use(function(err, req, res, next) {
	// don't do anything if the response was already sent
	if (res.headersSent) {
		return;
	}

	res.status(500);

	if (req.accepts('html')) {
		res.send('Internal Server Error. Request identifier: ' + req.id);
		return;
	}

	if (req.accepts('json')) {
		res.json({ error: 'Internal Server Error', requestId: req.id });
		return;
	}

	res.type('txt').send('Internal Server Error. Request identifier: ' + req.id);

	next();
});


process.on('uncaughtException', function(err) {
	log.error({err: err}, 'uncaught exception');
	setTimeout(function() {
		process.exit(1);
	}, 1000);
});

function start() {
	var port = process.env.PORT || 3000;

	server.listen(port, function(err) {
		if (err) { return log.error({err: err}, 'listen error'); }
		log.info({port: port}, 'listening on %s', port);
	});
	server.on('error', function(err) {
		log.error({err: err}, 'express error');
	});
	return server;
}

module.exports = {
	app: app,
	start: start
};
