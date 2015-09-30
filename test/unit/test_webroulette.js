import '../../src/bootstrap';

import chai from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import nock from 'nock';

let expect = chai.expect;
let should = chai.should();

import Promise from 'bluebird';
import Webroulette from '../../src/webroulette';

describe('Webroulette', () => {

	it('should call startCommunication on both parties with one initiator', () => {
		let w1 = createWebroulette();
		let w2 = createWebroulette();

		w1.cp.receive('enqueue');
		w2.cp.receive('enqueue');

		let done1 = Promise.pending();
		let done2 = Promise.pending();

		let initiator;

		w1.cp.registerClientHandler('startCommunication', (opt) => {
			if (opt.initiator) {
				if (initiator) { return done1.reject(new Error('already has an initiator')); }
				initiator = 1;
			}
			done1.resolve();
		});
		w2.cp.registerClientHandler('startCommunication', (opt) => {
			if (opt.initiator) {
				if (initiator) { return done2.reject(new Error('already has an initiator')); }
				initiator = 2;
			}
			done2.resolve();
		});

		return Promise.all([done1.promise, done2.promise]).then(() => {
			initiator.should.be.a('number');
		});
	});

	it('should relay offer SDP', () => {
		let w1 = createWebroulette();
		let w2 = createWebroulette();

		w1.cp.receive('enqueue');
		w2.cp.receive('enqueue');

		let done = Promise.pending();

		w1.cp.registerClientHandler('startCommunication', (opt) => {
			if (!opt.initiator) { throw new Error('w1 should be the initiator'); }
			w1.cp.receive('sendOffer', {offer: 'SDP string'}).then(() => {
				done.resolve();
			});
		});
		w2.cp.registerClientHandler('startCommunication', (opt) => true);
		w2.cp.registerClientHandler('gotOffer', (opt) => {
			try {
				opt.offer.should.be.a('string');
			} catch (err) {
				done.reject(err);
			}
		});

		return Promise.all([done.promise]);
	});

	it('should not accept sendOffer from a non-initiator', () => {
		let w1 = createWebroulette();
		let w2 = createWebroulette();

		w1.cp.receive('enqueue');
		w2.cp.receive('enqueue');

		let done = Promise.pending();

		w1.cp.registerClientHandler('startCommunication', (opt) => true);
		w2.cp.registerClientHandler('startCommunication', (opt) => {
			if (opt.initiator) { throw new Error('w1 should be the initiator'); }
			w2.cp.receive('sendOffer', {offer: 'SDP string'}).catch((err) => {
				if (err.message.indexOf('waiting-for-offer') !== -1) {
					done.resolve();
				} else {
					done.reject(err);
				}
			});
		});
		w1.cp.registerClientHandler('gotOffer', (opt) => true);

		return Promise.all([done.promise]);
	});

	it('should relay answer SDP', () => {
		let w1 = createWebroulette();
		let w2 = createWebroulette();

		w1.cp.receive('enqueue');
		w2.cp.receive('enqueue');

		let done = Promise.pending();

		w1.cp.registerClientHandler('startCommunication', (opt) => {
			if (!opt.initiator) { throw new Error('w1 should be the initiator'); }
			w1.cp.receive('sendOffer', {offer: 'SDP offer'});
		});
		w2.cp.registerClientHandler('startCommunication', (opt) => true);
		w2.cp.registerClientHandler('gotOffer', (opt) => {
			w2.cp.receive('sendAnswer', {answer: 'SDP answer'}).then(() => done.resolve());
		});
		w1.cp.registerClientHandler('gotAnswer', (opt) => {
			try {
				opt.answer.should.be.a('string');
			} catch (err) {
				done.reject(err);
			}
		});

		return Promise.all([done.promise]);
	});

	it('should relay ICE candidates', () => {
		let w1 = createWebroulette();
		let w2 = createWebroulette();

		w1.cp.receive('enqueue');
		w2.cp.receive('enqueue');

		let done1 = Promise.pending();
		let done2 = Promise.pending();

		w1.cp.registerClientHandler('startCommunication', (opt) => {
			if (!opt.initiator) { throw new Error('w1 should be the initiator'); }
			w1.cp.receive('sendOffer', {offer: 'SDP offer'});
			w1.cp.receive('sendIceCandidates', {iceCandidates: [{candidate: 'a'}]}).then(() => done1.resolve());
		});
		w2.cp.registerClientHandler('startCommunication', (opt) => true);
		w2.cp.registerClientHandler('gotOffer', (opt) => {
			w2.cp.receive('sendAnswer', {answer: 'SDP answer'});
			w2.cp.receive('sendIceCandidates', {iceCandidates: [{candidate: 'a'}, {candidate: 'b'}]}).then(() => done2.resolve());
		});
		w1.cp.registerClientHandler('gotAnswer', (opt) => true);
		w1.cp.registerClientHandler('gotIceCandidates', (opt) => true);
		w2.cp.registerClientHandler('gotIceCandidates', (opt) => true);

		return Promise.all([done1.promise, done2.promise]);
	});

	function createWebroulette() {
		class MockCp {
			constructor() {
				this.handlers = {};
				this.clientHandlers = {};
				this.socket = {
					disconnected: false
				};
			}

			register(name, fn) {
				this.handlers[name] = fn;
			}

			receive(name, param) {
				return Promise.resolve().then(() => this.handlers[name](param));
			}

			registerClientHandler(name, fn) {
				this.clientHandlers[name] = fn;
			}

			send(name, param) {
				return Promise.resolve().then(() => this.clientHandlers[name](param));
			}
		}

		return new Webroulette({cp: new MockCp()});
	}
});
