import Promise from 'bluebird';

const $current = Symbol();

export default class SerialPool {
	constructor() {
		this[$current] = Promise.resolve();
	}

	run(fn) {
		return this[$current] = this[$current].reflect().then(fn);
	}
}
