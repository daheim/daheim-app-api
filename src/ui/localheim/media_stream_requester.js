import EventEmitter from 'events';
import MediaStreamGuard from './media_stream_guard';

import createDebug from 'debug';
let debug = createDebug('dhm:localheim:msr');

const $current = Symbol();
const $running = Symbol();
const $constraints = Symbol();
const $closed = Symbol();

export default class MediaStreamRequester extends EventEmitter {

	constructor({constraints} = {}) {
		super();
		this[$constraints] = constraints;
	}

	start() {
		this.run();
	}

	async run() {
		if (this[$closed] || this[$running] || this[$current]) { return; }

		this[$running] = true;
		try {
			debug('asking for stream');
			let stream = await navigator.mediaDevices.getUserMedia(this[$constraints]);
			if (this[$closed]) { return MediaStreamGuard.closeStream(stream); }
			let guard = this[$current] = new MediaStreamGuard({stream});
			guard.once('close', () => {
				delete this[$current];
				this.run();
			});
			this.emit('stream', guard);
		} catch (err) {
			debug('error', err);
			setTimeout(() => this.run(), 1000);
		} finally {
			this[$running] = false;
		}
	}

	close() {
		if (this[$closed]) { return; }
		this[$closed] = true;
	}
}
