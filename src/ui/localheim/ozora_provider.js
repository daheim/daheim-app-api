import EventEmitter from 'events';
import {default as Ozora, SioChannel} from '../../ozora';

import createDebug from 'debug';
let debug = createDebug('dhm:localheim:ozora');

const $socket = Symbol();
const $userId = Symbol();
const $onSocketConnectHandler = Symbol();
const $onSocketConnect = Symbol();
const $closed = Symbol();
const $zero = Symbol();
const $ozora = Symbol();

export default class OzoraProvider extends EventEmitter {

	constructor({socket, userId}) {
		super();

		this[$socket] = socket;
		this[$userId] = userId;
	}

	start() {
		this[$onSocketConnectHandler] = () => this[$onSocketConnect]();
		this[$socket].on('connect', this[$onSocketConnectHandler]);

		if (this[$socket].connected) {
			this[$onSocketConnectHandler]();
		}
	}

	get current() {
		if (this[$ozora] && !this[$ozora].disconnected) {
			return this[$ozora];
		}
	}

	async [$onSocketConnect]() {
		if (this[$closed]) { return; }

		let channel = new SioChannel({socket: this[$socket]});
		let ozora = new Ozora({channel, zero: {}});
		let zero = this[$zero] = ozora.getObject(0);
		try {
			await zero.invoke('auth', {userId: this[$userId]});
			if (this[$closed]) { return; }
			this[$ozora] = ozora;
			this.emit('connect', ozora);
		} catch (err) {
			debug('auth error', err);
		}
	}

	close() {
		if (this[$closed]) { return; }
		this[$closed] = true;

		this[$socket].removeListener('connect', this[$onSocketConnectHandler]);
		// close ozora
	}

}
