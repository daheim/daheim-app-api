import '../../src/bootstrap';
import sio from 'socket.io';
import Promise from 'bluebird';
import {default as EncounterRegistry, OzoraUserEncounterInterface} from '../../src/localheim';
import IceServerProvider from '../../src/ice_server_provider';
import {default as Ozora, SioChannel, SimpleReceiver} from '../../src/ozora';
import http from 'http';
import io from 'socket.io-client';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import createDebug from 'debug';
import log from '../../src/log';

let debug = createDebug('dhm:test:localheim');

chai.use(chaiAsPromised);
let expect = chai.expect;
chai.should();


describe('Localheim Integration', () => {

	let server;
	let url;

	beforeEach(() => {
		let iceServerProvider = new IceServerProvider();
		let registry = new EncounterRegistry({iceServerProvider, log});

		server = http.createServer();
		let io = sio.listen(server);
		io.on('connection', socket => {
			new OzoraSocket({socket, registry});
		});
		server.listen(0);
		url = 'http://0.0.0.0:' + server.address().port;
	});

	it('should connect', async () => {
		let c1 = createOzoraClient();
		let c2 = createOzoraClient();

		await Promise.all([waiter(c1, 'connect'), waiter(c2, 'connect')]);

		let zero1 = c1.ozora.getObject(0);
		let zero2 = c2.ozora.getObject(0);

		zero1.invoke('auth', {userId: 'one'});
		zero2.invoke('auth', {userId: 'two'});

		let cb1 = new SimpleReceiver();
		let cb2 = new SimpleReceiver();

		let cbid1 = c1.ozora.register(cb1);
		let cbid2 = c2.ozora.register(cb2);

		cb1.onMatch = asyncSpy();
		cb2.onMatch = asyncSpy();

		cb1.onNegotiate = asyncSpy();
		cb2.onNegotiate = asyncSpy();

		cb1.onRelay = asyncSpy();
		cb2.onRelay = asyncSpy();

		cb1.onClose = asyncSpy();
		cb2.onClose = asyncSpy();

		let e1 = c1.ozora.getObject(await zero1.invoke('createEncounter', {callbackId: cbid1}));
		let e2 = c2.ozora.getObject(await zero2.invoke('createEncounter', {callbackId: cbid2}));

		expect(await e1.invoke('start')).to.be.equal('queued');
		expect(await e2.invoke('start')).to.be.equal('queued');

		let m1 = await cb1.onMatch.get(0);
		let m2 = await cb2.onMatch.get(0);

		let members1 = m1[0].members;
		let members2 = m2[0].members;

		let p1 = members1.filter(m => !m.self)[0];
		let p2 = members2.filter(m => !m.self)[0];

		await e1.invoke('accept');
		await e2.invoke('accept');

		await cb1.onNegotiate.get(0);
		await cb2.onNegotiate.get(0);

		await e1.invoke('sendRelay', {message: {rekeke: 'susu'}, participant: p1.id});
		await e2.invoke('sendRelay', {message: {sarkany: 'fu'}, participant: p2.id});

		expect(await cb1.onRelay.get(0)).to.have.deep.property('0.message.sarkany', 'fu');
		expect(await cb2.onRelay.get(0)).to.have.deep.property('0.message.rekeke', 'susu');

		await e1.invoke('close', {reason: 'bye'});
		expect(await cb1.onClose.get(0)).to.have.deep.property('0.reason', 'bye');
		expect(await cb2.onClose.get(0)).to.have.deep.property('0.reason', 'bye');

		c1.close();
		c2.close();
	});

	it('should reconnect', async () => {
		let c1 = createOzoraClient();
		let c2 = createOzoraClient();

		await Promise.all([waiter(c1, 'connect'), waiter(c2, 'connect')]);

		let zero1 = c1.ozora.getObject(0);
		let zero2 = c2.ozora.getObject(0);

		zero1.invoke('auth', {userId: 'one'});
		zero2.invoke('auth', {userId: 'two'});

		let cb1 = new SimpleReceiver();
		let cb2 = new SimpleReceiver();

		let cbid1 = c1.ozora.register(cb1);
		let cbid2 = c2.ozora.register(cb2);

		cb1.onMatch = asyncSpy();
		cb2.onMatch = asyncSpy();

		cb1.onNegotiate = asyncSpy();
		cb2.onNegotiate = asyncSpy();

		cb1.onRelay = asyncSpy();
		cb2.onRelay = asyncSpy();

		cb1.onClose = asyncSpy();
		cb2.onClose = asyncSpy();

		cb1.onRenegotiate = asyncSpy();

		let e1 = c1.ozora.getObject(await zero1.invoke('createEncounter', {callbackId: cbid1}));
		let e2 = c2.ozora.getObject(await zero2.invoke('createEncounter', {callbackId: cbid2}));

		expect(await e1.invoke('start')).to.be.equal('queued');
		expect(await e2.invoke('start')).to.be.equal('queued');

		let m1 = await cb1.onMatch.get(0);
		let m2 = await cb2.onMatch.get(0);

		let members1 = m1[0].members;
		let members2 = m2[0].members;

		let p1 = members1.filter(m => !m.self)[0];
		let p2 = members2.filter(m => !m.self)[0];

		await e1.invoke('accept');
		await e2.invoke('accept');

		await cb1.onNegotiate.get(0);
		await cb2.onNegotiate.get(0);

		// disconnect and reconnect with two
		let w = waiter(c2, 'disconnect');
		c2.disconnect();
		debug('waiting for disconnect');
		await w;

		debug('connecting');
		c2.connect();
		await waiter(c2, 'connect');
		debug('connected');

		zero2 = c2.ozora.getObject(0);
		cb2 = new SimpleReceiver();
		cbid2 = c2.ozora.register(cb2);
		cb2.onNegotiate = asyncSpy();
		cb2.onRelay = asyncSpy();

		zero2.invoke('auth', {userId: 'two'});
		e2 = c2.ozora.getObject(await zero2.invoke('createEncounter', {callbackId: cbid2 }));

		await e2.invoke('start').should.eventually.be.equal('renegotiate');

		let n2 = await cb2.onNegotiate.get(0);
		n2.should.have.deep.property('0.iceServers');
		n2.should.have.deep.property('0.members');

		members2 = n2[0].members;
		p2 = members2.filter(m => !m.self)[0];

		let reneg1 = await cb1.onRenegotiate.get(0);
		reneg1.should.have.deep.property('0.iceServers');
		reneg1.should.have.deep.property('0.partner');

		await e2.invoke('sendRelay', {message: {sarkany: 'fu'}, participant: p2.id});
		await e1.invoke('sendRelay', {message: {rekeke: 'susu'}, participant: p1.id});

		expect(await cb1.onRelay.get(0)).to.have.deep.property('0.message.sarkany', 'fu');
		expect(await cb2.onRelay.get(0)).to.have.deep.property('0.message.rekeke', 'susu');

		c1.close();
		c2.close();
	});

	it('should replace connection in queue', async () => {
		let c1 = createOzoraClient();
		let c2 = createOzoraClient();

		await Promise.all([waiter(c1, 'connect'), waiter(c2, 'connect')]);

		let zero1 = c1.ozora.getObject(0);
		let zero2 = c2.ozora.getObject(0);

		zero1.invoke('auth', {userId: 'one'});
		zero2.invoke('auth', {userId: 'one'});

		let cb1 = new SimpleReceiver();
		let cb2 = new SimpleReceiver();

		let cbid1 = c1.ozora.register(cb1);
		let cbid2 = c2.ozora.register(cb2);

		cb1.onClose = asyncSpy();
		cb2.onClose = asyncSpy();

		let e1 = c1.ozora.getObject(await zero1.invoke('createEncounter', {callbackId: cbid1}));
		let e2 = c2.ozora.getObject(await zero2.invoke('createEncounter', {callbackId: cbid2}));

		await e1.invoke('start');
		await e2.invoke('start');

		expect(await cb1.onClose.get(0)).to.have.deep.property('0.reason', 'replaced');

		c1.close();
		c2.close();
	});

	it('should handle partner reject', async () => {
		let c1 = createOzoraClient();
		let c2 = createOzoraClient();

		await Promise.all([waiter(c1, 'connect'), waiter(c2, 'connect')]);

		let zero1 = c1.ozora.getObject(0);
		let zero2 = c2.ozora.getObject(0);

		zero1.invoke('auth', {userId: 'one'});
		zero2.invoke('auth', {userId: 'two'});

		let cb1 = new SimpleReceiver();
		let cb2 = new SimpleReceiver();

		let cbid1 = c1.ozora.register(cb1);
		let cbid2 = c2.ozora.register(cb2);

		cb1.onMatch = asyncSpy();
		cb2.onMatch = asyncSpy();

		cb1.onClose = asyncSpy();
		cb2.onClose = asyncSpy();

		let e1 = c1.ozora.getObject(await zero1.invoke('createEncounter', {callbackId: cbid1}));
		let e2 = c2.ozora.getObject(await zero2.invoke('createEncounter', {callbackId: cbid2}));

		await e1.invoke('start');
		await e2.invoke('start');

		await cb1.onMatch.get(0);
		await cb2.onMatch.get(0);

		await e1.invoke('accept');
		await e2.invoke('close', {reason: 'kebab'});

		expect(await cb1.onClose.get(0)).to.have.deep.property('0.reason', 'partner_closed');
		expect(await cb2.onClose.get(0)).to.have.deep.property('0.reason', 'kebab');

		c1.close();
		c2.close();
	});

	it('should handle protocol error', async () => {
		let c1 = createOzoraClient();
		let c2 = createOzoraClient();

		await Promise.all([waiter(c1, 'connect'), waiter(c2, 'connect')]);

		let zero1 = c1.ozora.getObject(0);
		let zero2 = c2.ozora.getObject(0);

		zero1.invoke('auth', {userId: 'one'});
		zero2.invoke('auth', {userId: 'two'});

		let cb1 = new SimpleReceiver();
		let cb2 = new SimpleReceiver();

		let cbid1 = c1.ozora.register(cb1);
		let cbid2 = c2.ozora.register(cb2);

		let close1 = Promise.pending();
		let close2 = Promise.pending();

		cb1.onMatch = x => x;
		cb1.onClose = ({reason}) => {
			close1.resolve(reason);
			c1.ozora.unregister(cbid1);
		};
		cb2.onClose = ({reason}) => {
			close2.resolve(reason);
			c2.ozora.unregister(cbid2);
		};

		let e1 = c1.ozora.getObject(await zero1.invoke('createEncounter', {callbackId: cbid1}));
		let e2 = c2.ozora.getObject(await zero2.invoke('createEncounter', {callbackId: cbid2}));

		await e1.invoke('start');
		await e2.invoke('start');

		expect(await close1.promise).to.be.equal('partner_closed');
		expect(await close2.promise).to.be.equal('protocol_error');

		c1.close();
		c2.close();
	});

	function createClient() {
		return io.connect(url, {
			'force new connection': true,
			reconnectionDelayMax: 1
		});
	}

	function createOzoraClient() {
		let socket = createClient();
		socket.on('connect', () => {
			socket.ozora = new Ozora({channel: new SioChannel({socket}), zero: {}});
		});
		return socket;
	}


});


const $socket = Symbol();
const $ozora = Symbol();
const $registry = Symbol();

class OzoraSocket extends SimpleReceiver {
	constructor({socket, registry}) {
		super();

		this[$socket] = socket;
		this[$ozora] = new Ozora({
			channel: new SioChannel({socket}),
			zero: this
		});
		this[$registry] = registry;
	}

	auth({userId}) {
		this[$ozora].userId = userId;
		this[$ozora].user = {
			id: userId,
			profile: {
				name: userId,
				languages: [],
				topics: []
			}
		};
	}

	createEncounter({callbackId}) {
		let callback = this[$ozora].getObject(callbackId);
		let iface = new OzoraUserEncounterInterface({callback, registry: this[$registry]});
		return iface.objectId;
	}
}

function waiter(object, event) {
	let resolver = Promise.pending();
	let done = () => {
		object.removeListener(event, done);
		resolver.resolve();
	};
	object.on(event, done);
	return resolver.promise;
}

function asyncSpy() {
	let numCalls = 0;
	let calls = [];
	let result = function() {
		let cur = numCalls++;
		if (calls[cur]) {
			calls[cur].resolve(arguments);
		} else {
			calls[cur] = {promise: Promise.resolve(arguments)};
		}
	};
	result.get = num => {
		if (!calls[num]) {
			calls[num] = Promise.pending();
		}
		return calls[num].promise;
	};
	return result;
}
