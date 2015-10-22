import sio from 'socket.io';
import Promise from 'bluebird';
import EncounterRegistry from './localheim';
import EventEmitter from 'events';
import IceServerProvider from './ice_server_provider';
import {default as Ozora, SioChannel, SimpleReceiver, WhitelistReceiver} from './ozora';


const $io = Symbol();
const $log = Symbol();
const $registry = Symbol();

class Realtime {

	constructor(opt) {
		opt = opt || {};
		if (!opt.server) { throw new Error('opt.server must be defined'); }
		if (!opt.log) { throw new Error('opt.log must be defined'); }

		this[$log] = opt.log;

		let io = this[$io] = sio.listen(opt.server);
		io.on('connection', (client) => this._onConnection(client));

		let iceServerProvider = new IceServerProvider();
		this[$registry] = new EncounterRegistry({iceServerProvider});
	}

	static create(opt) {
		return new Realtime(opt);
	}

	_onConnection(client) {
		let log = this[$log];
		this[$log].info({clientId: client.id}, 'sio connection');

		let reelClient = new Client({socket: client, registry: this[$registry]});

		client.on('error', (err) => {
			this[$log].error({err: err}, 'client error');
		});

		client.on('disconnect', () => {
			this[$log].info({clientId: client.id}, 'sio disconnect');
		});
	}
}

const $socket = Symbol();
const $ozora = Symbol();
const $serial = Symbol();
class Client extends WhitelistReceiver {

	constructor({socket, registry}) {
		super(['auth', 'getUserId', 'ready']);
		this[$socket] = socket;
		this[$ozora] = new Ozora({
			channel: new SioChannel({socket}),
			zero: this
		});
		this[$serial] = new SerialRunner();
		this[$registry] = registry;
	}

	auth({userId}) {
		this[$ozora].userId = userId;
	}

	getUserId() {
		return this[$serial].run(() => {
			console.log('running 2');
			return this[$socket].userId;
		});
	}

	ready({callbackId}) {
		return this[$serial].run(() => {
			let callback = this[$ozora].getObject(callbackId);
			return this[$registry].ready({callback});
		});
	}

}


const $current = Symbol();
class SerialRunner {
	constructor() {
		this[$current] = Promise.resolve();
	}

	run(fn) {
		return this[$current] = this[$current].reflect().then(fn);
	}
}


export default Realtime;
