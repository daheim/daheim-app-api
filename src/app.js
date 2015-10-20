require('./bootstrap');
if (process.env.NEW_RELIC_LICENSE_KEY) {require('newrelic');}

var express = require('express');

var request = require('request-promise');
var Promise = require('bluebird');
var util = require('util');
var zlib = require('zlib');
var bodyParser = require('body-parser');

var log = require('./log');

var app = express();
var server = require('http').Server(app);

require('./realtime').create({log, server});
//var io = require('socket.io').listen(server);


app.use(log.requestLogger());
app.enable('trust proxy');
app.disable('x-powered-by');
app.use(bodyParser.json());

app.use(express.static(__dirname + '/../../../build/public'));

app.get('/', function(req, res) {
	res.send('Hello World!');
});

app.get('/js/config.js', function(req, res) {
	var cfg = {
		socketIoUrl: 'http://localhost:3000'
	};
	res.send('angular.module("dhm").constant("config", ' + JSON.stringify(cfg) + ');');
});



var germans = [];
var friends = [];




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
