/**
 * @module ozora
 */

import Promise from 'bluebird';
import BluebirdUtil from 'bluebird/js/main/util';
import EventEmitter from 'events';
import createDebug from 'debug';

let debug = createDebug('dhm:ozora');

const $receiver = Symbol();

const $nextId = Symbol('nextId');
const $commands = Symbol('commands');
const $channel = Symbol('channel');
const $request = Symbol('request');
const $objects = Symbol('objects');

const $onMessage = Symbol('onMessage');
const $processAck = Symbol('processAck');
const $processRequest = Symbol('processRequest');

export default class Ozora extends EventEmitter {

	/**
	 * @param {Receiver} zero Object Zero
	 * @param {Channel} channel Communication channel
	 */
	constructor({zero, channel}) {
		super();
		this[$nextId] = 1;
		this[$objects] = {0: zero};
		this[$commands] = {};
		this[$channel] = channel;
		channel.onMessage = data => this[$onMessage](data);
		channel.onDisconnect = () => {
			for (let command of Object.values(this[$commands])) {
				command.reject(new Error('disconnected'));
			}
			this[$commands] = {};
			this[$objects] = {0: zero};
			this.emit('disconnect');
		};
	}

	/**
	 * Receiver symbol
	 * @returns {Symbol}
	 */
	static get receiver() {
		return $receiver;
	}

	get disconnected() {
		return this[$channel].disconnected;
	}

	/**
	 * @param {number} object
	 * @param {string} method
	 * @param {array} args
	 * @param {object} [opt={}]
	 * @param {number} [opt.timeout=10000]
	 */
	async invoke(object, method, args = [], {timeout = 10000} = {}) {
		let id = this[$nextId]++;
		let resolver = Promise.pending();
		let data = {id, object, method, args};
		resolver[$request] = data;

		try {
			this[$commands][id] = resolver;
			this[$channel].send(data);
			return await resolver.promise.timeout(timeout);
		} finally {
			delete this[$commands][id];
		}
	}

	register(object) {
		let id = this[$nextId]++;
		this[$objects][id] = object;
		return id;
	}

	unregister(id) {
		delete this[$objects][id];
	}

	getObject(id) {
		return new OzoraObject({id, ozora: this});
	}

	/**
	 * @private
	 */
	[$onMessage](data) {
		if (data.ack) { return this[$processAck](data); }
		if (data.id) { return this[$processRequest](data); }
		debug('illegal incoming message', data);
	}

	/**
	 * @private
	 */
	[$processAck](data) {
		let cmd = this[$commands][data.ack];
		if (!cmd) {
			debug('ack arrived to an unknown command', data);
			return;
		}

		delete this[$commands][data.ack];
		if (data.error) {
			let error = new Error(data.error.message);
			error.name = data.error.name;
			debug('request error:', cmd[$request], '->', error);
			cmd.reject(error);
		} else {
			debug('request success:', cmd[$request], '->', data.result);
			cmd.resolve(data.result);
		}
	}

	/**
	 * @private
	 */
	async [$processRequest](data) {
		let process = async () => {
			let object = this[$objects][data.object];
			if (!object) {
				throw new Error('invalid object');
			}
			if (typeof object[$receiver] !== 'function') {
				throw new Error('invalid receiver object');
			}
			return await object[$receiver](data);
		};

		try {
			let result = await process();
			debug('local success:', data, '->', result);
			let res = {
				ack: data.id,
				result
			};
			this[$channel].send(res);
		} catch (err) {
			let err2 = BluebirdUtil.ensureErrorObject(err);
			debug('local error:', data, '->', err2.stack);
			let res = {
				ack: data.id,
				error: {
					name: err2.name,
					message: err2.message
				}
			};
			this[$channel].send(res);
		}
	}

}

const $ozora = Symbol();
const $id = Symbol();

export class OzoraObject extends EventEmitter {

	constructor({ozora, id}) {
		super();
		this[$ozora] = ozora;
		this[$id] = id;
		this[$ozora].on('disconnect', () => this.emit('disconnect'));
	}

	get ozora() { return this[$ozora]; }
	get disconnected() { return this[$ozora].disconnected; }

	invoke(method, ...args) {
		return this[$ozora].invoke(this[$id], method, args);
	}

}

/**
 * Abstract communication channel used by {@link Ozora}.
 * @interface
 */
export class Channel {

	/**
	 * Send an outbound message
	 * @param {object} message
	 */
	send(message) {

	}

	get disconnected() {

	}

	/**
	 * Notify user of an inbound message
	 * @param {object} message
	 */
	onMessage(message) {

	}

	/**
	 * Notify user that the communication channel is broken.
	 */
	onDisconnect() {

	}

}

const $socket = Symbol();
const $name = Symbol();

/**
 * {@link Ozora} channel communicating through Socket.IO.
 */
export class SioChannel extends Channel {

	/**
	 * @param {SocketIOSocket} socket
	 */
	constructor({socket, name = 'ozora'}) {
		super();
		this[$socket] = socket;
		this[$name] = name;
		this[$socket].on(name, message => this.onMessage(message));
		this[$socket].on('disconnect', () => this.onDisconnect());
	}

	get disconnected() {
		return this[$socket].disconnected;
	}

	send(message) {
		if (this[$socket].disconnected && this[$socket].io && !this[$socket].io.reconnecting) {
			throw new Error('socket disconnected');
		}
		this[$socket].emit(this[$name], message);
	}
}

/**
 * @interface
 */
export class Receiver {
	/**
	 * @param {string} method Name of the method to invoke
	 * @param {array} args Arguments to invoke with
	 */
	[Ozora.receiver]({method, args}) {

	}
}

export class SimpleReceiver extends Receiver {

	/** @inheritdoc */
	async [Ozora.receiver]({method, args}) {
		if (typeof this[method] !== 'function') {
			throw new Error('invalid method');
		}
		return await this[method].apply(this, args);
	}
}

const $whitelist = Symbol();
const $mixinConstructor = Symbol();
export class WhitelistReceiver extends Receiver {

	constructor(whitelist) {
		super();
		WhitelistReceiver[$mixinConstructor](this, whitelist);
	}

	static [$mixinConstructor](object, whitelist) {
		object[$whitelist] = {};
		for (let name of whitelist) {
			object[$whitelist][name] = true;
		}
	}

	static mixin(object, whitelist) {
		WhitelistReceiver[$mixinConstructor](object, whitelist);
		object[Ozora.receiver] = WhitelistReceiver.prototype[Ozora.receiver];
		return object;
	}

	/** @inheritdoc */
	async [Ozora.receiver]({method, args}) {
		if (!this[$whitelist][method] || typeof this[method] !== 'function') {
			throw new Error('invalid method');
		}
		return await this[method].apply(this, args);
	}
}
