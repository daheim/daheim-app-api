import sio from 'socket.io';
import Promise from 'bluebird';
import CommandProtocol from './command_protocol';
import Webroulette from './webroulette';

const $io = Symbol();
const $log = Symbol();
const $cp = Symbol();
const $webroulette = Symbol();

class Realtime {

	constructor(opt) {
		opt = opt || {};
		if (!opt.server) { throw new Error('opt.server must be defined'); }
		if (!opt.log) { throw new Error('opt.log must be defined'); }

		this[$log] = opt.log;

		let io = this[$io] = sio.listen(opt.server);
		io.on('connection', (client) => this._onConnection(client));
	}

	static create(opt) {
		return new Realtime(opt);
	}

	_onConnection(client) {
		let log = this[$log];
		this[$log].info({clientId: client.id}, 'sio connection');

		let cp = client[$cp] = new CommandProtocol({client});
		let webroulette = client[$webroulette] = new Webroulette({cp});

		client.on('error', (err) => {
			this[$log].error({err: err}, 'client error');
		});

		client.on('disconnect', () => {
			this[$log].info({clientId: client.id}, 'sio disconnect');
		});
	}
}



export default Realtime;
