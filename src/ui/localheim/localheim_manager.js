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

const $updateState = Symbol();

export default class LocalheimManager extends EventEmitter {

	constructor({constraints, ozoraProvider}) {
		super();

		this[$mediaStreamRequester] = new MediaStreamRequester({constraints});
		this[$ozoraProvider] = ozoraProvider;
	}

	get partner() { return this[$localheimClient] ? this[$localheimClient].partner : undefined; }

	start() {
		if (this[$started]) { throw new Error('already started'); }
		this[$started] = true;

		debug('starting');

		this[$mediaStreamRequester].on('stream', guard => {
			this[$streamGuard] = guard;
			this.emit('localStream', guard);
			this[$streamGuard].on('close', () => {
				delete this[$streamGuard];
				this[$updateState]();
			});
			this[$updateState]();
		});
		this[$mediaStreamRequester].start();

		this[$ozoraProvider].on('connect', this[$onSocketConnect] = ozora => {
			debug('ozora connect');
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
		} else {
			return this[$localheimClient].state;
		}
	}

	[$updateState]() {
		if (this[$ozora] && this[$streamGuard]) {
			if (this[$localheimClient]) { return; }

			this[$localheimClient] = LocalheimClient.createAndStart({
				ozora: this[$ozora],
				streamGuard: this[$streamGuard]
			});
			this[$localheimClient].on('stateUpdate', () => this.emit('stateUpdate'));
			this[$localheimClient].on('remoteStream', stream => this.emit('remoteStream', stream));
			this[$localheimClient].on('close', () => {
				delete this[$localheimClient];
			});
		} else {
			if (this[$localheimClient]) {
				this[$localheimClient].close();
				delete this[$localheimClient];
			}
		}
		this.emit('stateUpdate');
	}

	accept() {
		if (!this[$localheimClient]) { return debug('no localheim client'); }
		this[$localheimClient].accept();
	}

	close() {
		if (this[$closed]) { return; }
		this[$closed] = true;

		debug('LocalheimManager close');

		this[$mediaStreamRequester].close();
		this[$ozoraProvider].removeListener('connect', this[$onSocketConnect]);

		if (this[$localheimClient]) {
			this[$localheimClient].close({reason: 'bye'});
		}
	}

}
