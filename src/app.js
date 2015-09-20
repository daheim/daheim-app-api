require('newrelic');

var express = require('express');

var Passport = require('passport').Passport;
var request = require('request-promise');
var Promise = require('bluebird');
var azureCommon = require('azure-common');
var azureStorage = require('azure-storage');
var util = require('util');
var zlib = require('zlib');
var bodyParser = require('body-parser');

var log = require('./log');

var server;

var app = express();
app.use(log.requestLogger());
app.enable('trust proxy');
app.disable('x-powered-by');
app.use(bodyParser.json());

app.use(express.static('public'));
app.use(express.static('build/public'));

app.get('/', function(req, res) {
	res.send('Hello World!');
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
});


process.on('uncaughtException', function(err) {
	log.error({err: err}, 'uncaught exception');
	setTimeout(function() {
		process.exit(1);
	}, 1000);
});

function start() {
	var port = process.env.PORT || 3000;

	server = app.listen(port, function(err) {
		if (err) { return log.error({err: err}, 'listen error'); }
		log.info({port: port}, 'listening on %s', port);
	});
	server.on('error', function(err) {
		log.error({err: err}, 'express error');
	});
}

module.exports = {
	app: app,
	start: start
};
