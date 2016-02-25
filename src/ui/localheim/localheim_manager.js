import EventEmitter from 'events';
import MediaStreamRequester from './media_stream_requester';
import {default as LocalheimClient} from './localheim_client';

import createDebug from 'debug';
let debug = createDebug('dhm:localheim:manager');

const $started = Symbol();
const $mediaStreamRequester = Symbol();
const $streamGuard = Symbol();
const $ozoraProvider = Symbol();
const $onSocketConnect = Symbol();
const $ozora = Symbol();
const $localheimClient = Symbol();
const $closed = Symbol();
const $closeReason = Symbol();

const $updateState = Symbol();

export default class LocalheimManager extends EventEmitter {

	constructor({constraints, ozoraProvider}) {
		super();

		this[$mediaStreamRequester] = new MediaStreamRequester({constraints});
		this[$ozoraProvider] = ozoraProvider;
	}

	get partner() { return this[$localheimClient] ? this[$localheimClient].partner : undefined; }
	get closeReason() { return this[$closeReason]; }
	get localStream() { return this[$streamGuard] ? this[$streamGuard].stream : undefined; }
	get remoteStream() { return this[$localheimClient] ? this[$localheimClient].remoteStream : undefined; }

	start() {
		if (this[$started]) { throw new Error('already started'); }
		this[$started] = true;

		this[$mediaStreamRequester].on('stream', guard => {
			this[$streamGuard] = guard;
			this[$streamGuard].on('close', () => {
				delete this[$streamGuard];
				this[$updateState]();
			});
			this[$updateState]();
			this.emit('localStream', guard);
		});
		this[$mediaStreamRequester].start();

		this[$ozoraProvider].on('connect', this[$onSocketConnect] = ozora => {
			this[$ozora] = ozora;
			this[$ozora].on('disconnect', () => {
				delete this[$ozora];
				this[$updateState]();
			});
			this[$updateState]();
		});
		if (this[$ozoraProvider].current) {
			this[$onSocketConnect](this[$ozoraProvider].current);
		}
	}

	[$onSocketConnect](ozora) {
		if (this[$closed]) { return; }
		this[$ozora] = ozora;
		this[$updateState]();
	}

	get state() {
		if (this[$closed]) {
			return 'closed';
		} if (!this[$streamGuard]) {
			return 'need-stream';
		} else if (!this[$ozora]) {
			return 'connecting';
		} else if (this[$localheimClient]) {
			return this[$localheimClient].state;
		} else {
			debug('get state() with no localheimClient');
			return 'partner-reconnect';
		}
	}

	[$updateState]() {
		if (this[$ozora] && this[$streamGuard]) {
			if (this[$localheimClient]) { return; }

			this[$localheimClient] = LocalheimClient.createAndStart({
				ozora: this[$ozora],
				streamGuard: this[$streamGuard],
			});
			this[$localheimClient].on('stateUpdate', () => this.emit('stateUpdate'));
			this[$localheimClient].on('remoteStream', stream => this.emit('remoteStream', stream));
			this[$localheimClient].on('close', reason => {
				debug('localheimClient closed: %s', reason);
				delete this[$localheimClient];
				if (reason === 'bye' || reason === 'replaced') {
					this.close({reason});
				}
			});
		} else {
			if (this[$localheimClient]) {
				this[$localheimClient].close({reason: 'requirements-gone'});
				delete this[$localheimClient];
			}
		}
		this.emit('stateUpdate');
	}

	accept() {
		if (!this[$localheimClient]) { return debug('cannot accept without localheim client'); }
		this[$localheimClient].accept();
	}

	close({reason = 'bye'} = {}) {
		if (this[$closed]) { return; }
		this[$closed] = true;

		this[$closeReason] = reason;

		debug('close: %s', reason);
		if (this[$localheimClient]) {
			this[$localheimClient].close({reason});
		}

		this[$mediaStreamRequester].close();
		if (this[$streamGuard]) {
			this[$streamGuard].close();
		}
		this[$ozoraProvider].removeListener('connect', this[$onSocketConnect]);

		this.emit('stateUpdate');
		this.emit('close', reason);
	}

}
