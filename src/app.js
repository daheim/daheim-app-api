require('./bootstrap');
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

var app = express();
var server = require('http').Server(app);

require('./realtime').create({server: server});
//var io = require('socket.io').listen(server);


app.use(log.requestLogger());
app.enable('trust proxy');
app.disable('x-powered-by');
app.use(bodyParser.json());

app.use(express.static('public'));
app.use(express.static('build/public'));

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
// io.on('connection', function(client) {
// 	log.info({clientId: client.id}, 'webrtc connection');

// 	client.on('identify', function(message) {
// 		log.info({clientId: client.id, message: message}, 'identify');

// 		if (message.as === 'german') {
// 			connectOrEnqueue(germans, friends);
// 		} else {
// 			connectOrEnqueue(friends, germans);
// 		}
// 	});

// 	client.on('disconnect', function() {
// 		log.info({clientId: client.id}, 'webrtc disconnect');

// 		var i = germans.indexOf(client);
// 		if (i >= 0) {
// 			germans.splice(i, 1);
// 		}
// 		i = friends.indexOf(client);
// 		if (i >= 0) {
// 			friends.splice(i, 1);
// 		}
// 	});

// 	client.emit('message', {hello: 'world'});

// 	function connectOrEnqueue(myQueue, partnerQueue) {
// 		if (!partnerQueue.length) {
// 			log.info({clientId: client.id}, 'enqueueing');
// 			myQueue.push(client);
// 			return;
// 		}

// 		var partner = partnerQueue.splice(0, 1)[0];
// 		log.info({clientId: client.id, partnerId: partner.id}, 'partner found');
// 		var channelId = 'egergo' + new Date().getTime() + Math.random();
// 		client.emit('partnerFound', {
// 			channelId: channelId
// 		});
// 		partner.emit('partnerFound', {
// 			channelId: channelId
// 		});

// 	}

// });



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
}

module.exports = {
	app: app,
	start: start
};
