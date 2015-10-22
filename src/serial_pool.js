import Promise from 'bluebird';
import createDebug from 'debug';

const debug = createDebug('dhm:serial');

const $current = Symbol();
const $counter = Symbol();

export default class SerialPool {
	constructor() {
		this[$counter] = 0;
		this[$current] = Promise.resolve();
	}

	run(fn) {
		this[$counter]++;
		return this[$current] = this[$current].reflect().then(() => this[$counter]--).then(fn);
	}

	static decorate(clazz, ...names) {
		let symbol = Symbol();
		for (let name of names) {
			let original = clazz.prototype[name];
			clazz.prototype[name] = function() {
				let args = arguments;
				let serialPool = this[symbol];
				if (!serialPool) { serialPool = this[symbol] = new SerialPool(); }
				serialPool.run(() => original.apply(this, args));
			};
		}
		return symbol;
	}
}
