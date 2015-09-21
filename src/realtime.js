import * as sio from 'socket.io';

const $io = Symbol();
const $log = Symbol();

class Realtime {

	constructor(opt) {
		opt = opt || {};
		if (!opt.server) { throw new Error('opt.server must be defined'); }
		if (!opt.log) { throw new Error('opt.log must be defined'); }

		this[$log] = opt.log;

		this.germans = [];
		this.friends = [];

		let io = this[$io] = sio.listen(opt.server);
		io.on('connection', (client) => this._onConnection(client));
	}

	static create(opt) {
		return new Realtime(opt);
	}

	_onConnection(client) {
		let log = this[$log];
		this[$log].info({clientId: client.id}, 'sio connection');

		client.on('identify', (message) => {
			this[$log].info({clientId: client.id, message: message}, 'sio identify');

			if (message.as === 'german') {
				connectOrEnqueue(this.germans, this.friends);
			} else {
				connectOrEnqueue(this.friends, this.germans);
			}
		});

		client.on('disconnect', () => {
			this[$log].info({clientId: client.id}, 'sio disconnect');

			let i = this.germans.indexOf(client);
			if (i >= 0) {
				this.germans.splice(i, 1);
			}
			i = this.friends.indexOf(client);
			if (i >= 0) {
				this.friends.splice(i, 1);
			}
		});

		client.emit('message', {hello: 'world'});

		function connectOrEnqueue(myQueue, partnerQueue) {
			if (!partnerQueue.length) {
				log.info({clientId: client.id}, 'enqueueing');
				myQueue.push(client);
				return;
			}

			let partner = partnerQueue.splice(0, 1)[0];
			log.info({clientId: client.id, partnerId: partner.id}, 'partner found');
			let channelId = 'egergo' + new Date().getTime() + Math.random();
			client.emit('partnerFound', {
				channelId: channelId
			});
			partner.emit('partnerFound', {
				channelId: channelId
			});

		}
	}
}

export default Realtime;
