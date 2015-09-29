import * as Promise from 'bluebird';

const $log = Symbol('log');
const $client = Symbol('client');
const $commands = Symbol('commands');
const $onCommand = Symbol('onCommand');
const $handlers = Symbol('handlers');
const $nextId = Symbol('nextId');

class CommandProtocol {

	constructor(opt) {
		opt = opt || {};
		if (!opt.client) { throw new Error('opt.client must be defined'); }

		this[$commands] = {};
		this[$nextId] = 1;
		this[$handlers] = {};

		this[$client] = opt.client;
		this[$client].on('command', (msg) => this[$onCommand](msg));
	}

	send(name, opt) {
		let id = this[$nextId]++;
		let resolver = this[$commands][id] = Promise.pending();
		this[$client].emit('command', {
			id: id,
			cmd: name,
			param: opt
		});
		return resolver.promise.timeout(10000).finally(() => {
			delete this[$commands][id];
		});
	}

	register(name, callback) {
		this[$handlers][name] = callback;
	}

	[$onCommand](msg) {
		if (msg.ack) {
			let cmd = this[$commands][msg.ack];
			if (!cmd) {
				return;
			}
			delete this[$commands][msg.ack];
			if (msg.error) {
				cmd.reject(msg.error);
			} else {
				cmd.resolve(msg.result);
			}
		} else if (msg.id) {
			let handler = this[$handlers][msg.cmd];
			if (!handler) {
				this[$client].emit('command', {
					ack: msg.id,
					error: {
						name: 'CommandNotFound'
					}
				});
			} else {
				Promise.resolve().then(() => handler(msg.param)).then((res) => {
					this[$client].emit('command', {
						ack: msg.id,
						result: res
					});
				}).catch((err) => {
					this[$client].emit('command', {
						ack: msg.id,
						error: {
							name: err.name,
							message: err.message
						}
					});
				});
			}
		} else {
			// TODO: handle illegal message
		}
	}
}

export default CommandProtocol;
