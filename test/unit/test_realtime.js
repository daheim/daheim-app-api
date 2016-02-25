require('../../src/server/bootstrap');
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

var log = require('../../src/server/log');

import Realtime from '../../src/server/realtime';
import convict from 'convict';

describe('Realtime', function() {
	var url;
	var server;

	beforeEach(function() {
		server = require('http').createServer();
		let config = convict({});
		config.set('ice', {});
		let realtime = new Realtime({log, config, tokenHandler: {}, userStore: {}});
		realtime.listen(server);
		server.listen(0);
		url = 'http://0.0.0.0:' + server.address().port;
	});

	afterEach(function() {
		server.close();
	});

	it('should be able to connect', function() {
		var client1 = createClient();
		var client2 = createClient();

		var p1 = Promise.pending();
		var p2 = Promise.pending();

		client1.once('connect', () => {
			p1.resolve();
		});

		client2.once('connect', (message) => {
			p2.resolve();
		});

		return Promise.all([p1.promise, p2.promise]);
	});

	function createClient() {
		return io.connect(url, {
			'force new connection': true,
		});
	}
});
