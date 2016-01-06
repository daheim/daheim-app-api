import sio from 'socket.io';
import {default as EncounterRegistry, OzoraUserEncounterInterface} from './localheim';
import IceServerProvider from './ice_server_provider';
import {default as Ozora, SioChannel, WhitelistReceiver} from './ozora';

import createDebug from 'debug';
const debug = createDebug('dhm:realtime');


const $io = Symbol('io');
const $log = Symbol('log');
const $registry = Symbol('registry');
const $tokenHandler = Symbol('tokenHandler');
const $userStore = Symbol('userStore');

const $onConnection = Symbol('onConnection');

class Realtime {

	constructor({log, tokenHandler, userStore, config}) {
		if (!log) { throw new Error('log must be defined'); }
		if (!tokenHandler) { throw new Error('tokenHandler must be defined'); }
		if (!userStore) { throw new Error('userStore must be defined'); }

		this[$log] = log;
		this[$tokenHandler] = tokenHandler;
		this[$userStore] = userStore;

		let iceServerProvider = new IceServerProvider(config.get('ice'));
		this[$registry] = new EncounterRegistry({iceServerProvider});
	}

	listen(server) {
		if (this[$io]) { throw new Error('already started'); }

		let io = this[$io] = sio.listen(server);
		io.on('connection', socket => this[$onConnection](socket));
	}

	[$onConnection](socket) {
		debug('new SIO connection: %s', socket.id);

		let channel = new SioChannel({socket});
		let ozora = new Ozora({channel});
		let zero = new Zero({
			registry: this[$registry],
			tokenHandler: this[$tokenHandler],
			userStore: this[$userStore],
			log: this[$log]
		});
		ozora.register(zero);

		socket.on('error', (err) => {
			this[$log].error({err: err}, 'client error');
		});

		socket.on('disconnect', () => {
			debug('SIO disconnected: %s', socket.id);
		});
	}
}

class Zero extends WhitelistReceiver {

	constructor({registry, tokenHandler, userStore, log}) {
		super(['auth', 'getUserId', 'ready', 'createEncounter']);
		this[$registry] = registry;
		this[$tokenHandler] = tokenHandler;
		this[$userStore] = userStore;
		this[$log] = log;
	}

	async auth({accessToken}) {
		try {
			let id = this[$tokenHandler].verifyAccessToken(accessToken);
			let profile = await this[$userStore].getProfile(id);
			this[$log].event('ozora_auth_success', {userId: id});
			this.ozora.user = {id, profile};
			this.ozora.userId = id;
		} catch (err) {
			this[$log].event('ozora_auth_error', {err});
			throw err;
		}
	}

	createEncounter({callbackId}) {
		let callback = this.ozora.getObject(callbackId);
		let iface = new OzoraUserEncounterInterface({callback, registry: this[$registry]});
		return iface.objectId;
	}

}

export default Realtime;
