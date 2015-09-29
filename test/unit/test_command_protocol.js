/*jshint -W030 */ // should assignments

require('../../src/bootstrap');
var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
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
var CommandProtocol = require('../../src/command_protocol');

chai.use(chaiAsPromised);

describe('CommandProtocol', function() {
	let callback;
	let cp;
	let clock;

	let client = {
		on: (name, cb) => callback = cb,
		emit: sinon.stub()
	};

	beforeEach(() => {
		clock = sinon.useFakeTimers();
		cp = new CommandProtocol({client});
	});

	afterEach(() => clock.restore());

	it('should execute remote command', () => {
		var promise = cp.send('hello', 'world');
		client.emit.args[0][0].should.be.equal('command');
		client.emit.args[0][1].id.should.exists;
		client.emit.args[0][1].cmd.should.be.equal('hello');
		client.emit.args[0][1].param.should.be.equal('world');
		callback({
			ack: client.emit.args[0][1].id,
			result: 'ok'
		});
		return promise.should.eventually.equal('ok');
	});

	it('should handle remote errors', () => {
		var promise = cp.send('hello', 'world');
		callback({
			ack: client.emit.args[0][1].id,
			error: {
				name: 'Error'
			}
		});
		return promise.should.be.rejected;
	});

	it('should not panic on unknown acks', () => {
		callback({
			ack: 17,
			error: {
				name: 'Error'
			}
		});
		var promise = cp.send('hello', 'world');
		callback({
			ack: client.emit.args[0][1].id,
			result: 'ok'
		});
		return promise.should.eventually.equal('ok');
	});

	it('should execute local command', () => {
		let done = Promise.pending();
		cp.register('ping', (param) => param);
		client.emit = (channel, msg) => done.resolve({channel: channel, msg: msg});
		callback({
			id: 17,
			cmd: 'ping',
			param: 23
		});
		return done.promise.then(function(res) {
			res.channel.should.be.equal('command');
			res.msg.ack.should.be.equal(17);
			res.msg.result.should.be.equal(23);
		});
	});

	it('should handle local errors', () => {
		let done = Promise.pending();
		cp.register('ping', (param) => {throw new Error('What a Terrible Failure');});
		client.emit = (channel, msg) => done.resolve({channel: channel, msg: msg});
		callback({
			id: 17,
			cmd: 'ping',
			param: 23
		});
		return done.promise.then(function(res) {
			res.channel.should.be.equal('command');
			res.msg.ack.should.be.equal(17);
			res.msg.error.name.should.be.equal('Error');
		});
	});

	it('should handle unknown commands', () => {
		let done = Promise.pending();
		client.emit = (channel, msg) => done.resolve({channel: channel, msg: msg});
		callback({
			id: 17,
			cmd: 'ping',
			param: 23
		});
		return done.promise.then(function(res) {
			res.channel.should.be.equal('command');
			res.msg.ack.should.be.equal(17);
			res.msg.error.name.should.be.equal('CommandNotFound');
		});
	});

	it('should time out when no result arrives', () => {
		var promise = cp.send('hello', 'world');
		clock.tick(20000);
		return promise.should.be.rejected;
	});
});
