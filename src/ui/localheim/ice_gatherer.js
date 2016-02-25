import EventEmitter from 'events';


const $ready = Symbol();
const $gathered = Symbol();
const $done = Symbol();
const $delay = Symbol();
const $timeout = Symbol();

const $trySend = Symbol();

export default class IceGatherer extends EventEmitter {

	constructor({delay} = {}) {
		super();
		this[$gathered] = [];
		this[$delay] = delay || 500;
	}

	add(candidate) {
		if (!candidate) {
			this[$done] = true;
		} else {
			this[$gathered].push(candidate);
		}
		this[$trySend]();
	}

	ready() {
		this[$ready] = true;
		this[$trySend]();
	}

	[$trySend](timeoutExpired) {
		if (!this[$ready]) { return; }
		if (!this[$done] && !timeoutExpired) {
			if (!this[$timeout]) {
				this[$timeout] = setTimeout(() => this[$trySend](true), this[$delay]);
			}
			return;
		}

		clearTimeout(this[$timeout]);
		delete this[$timeout];

		var gathered = this[$gathered];
		this[$gathered] = [];
		this.emit('send', {
			iceCandidates: gathered,
			iceComplete: this[$done],
		});
	}
}
