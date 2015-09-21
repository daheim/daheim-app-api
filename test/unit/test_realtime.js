require('../../src/bootstrap');
var chai = require('chai');
var sinon = require('sinon');
var supertest = require('supertest');
var nock = require('nock');

var expect = chai.expect;
var should = chai.should();

var Promise = require('bluebird');
var util = require('util');
var zlib = require('zlib');
var io = require('socket.io-client');

var log = require('../../src/log');
var Realtime = require('../../src/realtime');

describe('Realtime', function() {
	var url;
	var server;

	beforeEach(function() {
		server = require('http').createServer();
		var realtime = Realtime.create({log, server});
		server.listen(0);
		url = 'http://0.0.0.0:' + server.address().port;
	});

	afterEach(function() {
		server.close();
	});

	it('matches peope with each other', function() {
		var client1 = createClient();
		var client2 = createClient();

		var p1 = Promise.pending();
		var p2 = Promise.pending();

		client1.once('partnerFound', (message) => {
			message.should.have.property('channelId');
			p1.resolve();
		});

		client2.once('partnerFound', (message) => {
			message.should.have.property('channelId');
			p2.resolve();
		});

		client1.emit('identify', {as: 'german'});
		client2.emit('identify', {as: 'friend'});

		return Promise.all([p1.promise, p2.promise]);
	});

	it('dequeues disconnected people', function() {
		var done = Promise.pending();

		let client1 = createClient();
		client1.emit('identify', {as: 'german'});
		client1.once('listed', () => client1.close());
		client1.once('disconnect', () => {
			let client2 = createClient();
			client2.emit('identify', {as: 'friend'});
			client2.once('listed', (message) => {
				message.should.have.property('queueLength');
				done.resolve();
			});
		});

		return done.promise;
	});

	function createClient() {
		return io.connect(url, {
			'force new connection': true
		});
	}
});
