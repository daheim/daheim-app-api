import Promise from 'bluebird';
import EventEmitter from 'events';
import {WhitelistReceiver} from '../../ozora';
import RtcConnection from './rtc_connection';
import createDebug from 'debug';

let debug = createDebug('dhm:localheim_client');

const $stream = Symbol();
const $zero = Symbol();
const $conn = Symbol();
const $members = Symbol();
const $localheimObject = Symbol();
const $partner = Symbol();
const $me = Symbol();

export default class LocalheimClient extends EventEmitter {

	constructor({zero, stream}) {
		super();
		WhitelistReceiver.mixin(this, ['match', 'negotiate', 'receiveRelay', 'closed', 'renegotiate']);

		this[$zero] = zero;
		this[$stream] = stream;
	}

	get members() { return this[$members]; }
	get partner() { return this[$partner]; }
	get me() { return this[$me]; }

	match({members}) {
		this[$members] = members;
		for (let member of members) {
			if (member.self) {
				this[$me] = member;
			} else {
				this[$partner] = member;
			}
		}
		this.emit('match');
	}

	sendRelay(message) {
		return this[$localheimObject].invoke('sendRelay', {message});
	}

	receiveRelay(opt) {
		return this[$conn].onRelay(opt);
	}

	async ready() {
		let callbackId = this[$zero].ozora.register(this);
		let res = await this[$zero].invoke('ready', {callbackId: callbackId});
		this[$localheimObject] = this[$zero].ozora.getObject(res.id);
	}

	accept() {
		return this[$localheimObject].invoke('accept');
	}

	reject() {
		return this[$localheimObject].invoke('reject');
	}

	closed() {
		if (this[$conn]) {
			this[$conn].close();
		}
		this.emit('closed');
	}

	negotiate({members, iceServers} = {}) {
		if (members) {
			this[$members] = members;
			for (let member of members) {
				if (member.self) {
					this[$me] = member;
				} else {
					this[$partner] = member;
				}
			}
		}
		this.emit('negotiate');

		let conn = this[$conn] = new RtcConnection({
			stream: this[$stream],
			client: this,
			initiator: this.partner.id > this.me.id,
			iceServers
		});
		conn.on('stream', stream => this.emit('stream', stream));
		conn.start();
	}

	renegotiate({iceServers} = {}) {
		if (this[$conn]) {
			this[$conn].close();
		}

		let conn = this[$conn] = new RtcConnection({
			stream: this[$stream],
			client: this,
			initiator: this.partner.id > this.me.id,
			iceServers
		});
		conn.on('stream', stream => console.log('stream', stream));
		conn.start();
	}
}
