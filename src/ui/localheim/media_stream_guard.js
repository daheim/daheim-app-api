import EventEmitter from 'events';

import createDebug from 'debug';
let debug = createDebug('dhm:localheim:msg'); // eslint-disable-line no-unused-vars

const $stream = Symbol();
const $closed = Symbol();

export default class MediaStreamGuard extends EventEmitter {

	/**
	 * @param {object} opt
	 * @param {MediaStream} opt.stream
	 */
	constructor({stream}) {
		super();

		this[$stream] = stream;
		stream.oninactive = () => this.close();
	}

	get stream() { return this[$stream]; }

	close() {
		if (this[$closed]) { return; }
		this[$closed] = true;
		MediaStreamGuard.closeStream(this[$stream]);
		this.emit('close');
	}

	static closeStream(stream) {
		for (let track of stream.getTracks()) {
			track.stop();
		}
	}

}
