import Promise from 'bluebird';

const $onEnqueue = Symbol('onEnqueue');
const $state = Symbol('state');
const $cp = Symbol('cp');
const $partner = Symbol('partner');
const $onSendOffer = Symbol('onSendOffer');
const $onSendAnswer = Symbol('onSendAnswer');
const $onSendIceCandidates = Symbol('onSendIceCandidates');

const Init = 'new';
const Enqueuing = 'enqueuing';
const Enqueued = 'enqueued';
const PartnerOffered = 'partner-offered';
const PartnerAccepted = 'partner-accepted';
const CommunicationStarted = 'communication-started';
const SendingOffer = 'sending-offer';
const WaitingForOffer = 'waiting-for-offer';

class Webroulette {

	constructor(opt) {
		opt = opt || {};
		if (!opt.cp) { throw new Error('opt.cp must be defined'); }

		this[$cp] = opt.cp;
		opt.cp.register('enqueue', (opt) => this[$onEnqueue](opt));
		opt.cp.register('sendOffer', (opt) => this[$onSendOffer](opt));
		opt.cp.register('sendAnswer', (opt) => this[$onSendAnswer](opt));
		opt.cp.register('sendIceCandidates', (opt) => this[$onSendIceCandidates](opt));

		this[$state] = Init;
	}

	get cp() { return this[$cp]; }

	enqueue() {
		return Promise.resolve().then(() => {
			if (Webroulette.queued) {
				let partner = Webroulette.queued;
				delete Webroulette.queued;

				setImmediate(() => {
					var offerThis = this.offerPartner(partner);
					var offerThat = partner.offerPartner(this);
					Promise.all([offerThis, offerThat]).then(() => {
						console.log('offers accepted');
						return Promise.all([
							this.startCommunication({initiator: false}),
							partner.startCommunication({initiator: true})
						]);
					}).then(() => {
						console.log('communication started');
					}).catch(err => {
						console.error('offer rejected', err.stack);
						this.cancelCommunication({reason: err});
						partner.cancelCommunication({reason: err});
					});
				});
			} else {
				Webroulette.queued = this;
			}
		});
	}

	[$onEnqueue](opt) {
		if (this[$state] !== Init) { throw new Error(`fuckin cannot, current state: ${this[$state].toString()}`); }

		this[$state] = Enqueuing;
		return this.enqueue().then(() => {
			this[$state] = Enqueued;
		}).catch((err) => {
			this[$state] = Init;
			throw err;
		});
	}

	[$onSendOffer](opt) {
		if (this[$state] !== SendingOffer) { throw new Error(`cannot send offer in state ${this[$state].toString()}`); }
		opt = opt || {};
		if (!opt.offer || typeof opt.offer !== 'string') { throw new Error('opt.offer must be a string'); }
		return this[$partner].gotOffer({offer: opt.offer});
	}

	[$onSendAnswer](opt) {
		opt = opt || {};
		if (!opt.answer || typeof opt.answer !== 'string') { throw new Error('opt.answer must be a string'); }
		return this[$partner].gotAnswer({answer: opt.answer});
	}

	[$onSendIceCandidates](opt) {
		opt = opt || {};
		let bad = !Array.isArray(opt.iceCandidates);
		if (!bad) {
			bad = opt.iceCandidates.some((candidate) => typeof candidate !== 'object');
		}
		if (bad) { throw new Error('opt.iceCandidates must be an array of objects'); }
		return this[$partner].gotIce({iceCandidates: opt.iceCandidates});
	}

	offerPartner(partner) {
		return Promise.resolve().then(() => {
			if (this[$state] !== Enqueued) { throw new Error(`fuckin cannot, current state: ${this[$state].toString()}`); }
			if (this[$cp].socket.disconnected) { throw new Error('it is disconnected'); }
			this[$state] = PartnerOffered;
			this[$partner] = partner;
			this[$state] = PartnerAccepted;
		});
	}

	startCommunication(opt) {
		opt = opt || {};
		var initiator = !!opt.initiator;
		if (this[$state] !== PartnerAccepted) { throw new Error(`fuckin cannot, current state: ${this[$state].toString()}`); }
		this[$state] = initiator ? SendingOffer : WaitingForOffer;
		this[$cp].send('startCommunication', {initiator});
		// timeout for sendAnswer
	}

	/**
	 * Invoked when either one of the parties rejected the offered partner,
	 * or startCommunication did not succeed.
	 *
	 * @param {Error} opt.reason
	 */
	cancelCommunication(opt) {
		opt = opt || {};
		return Promise.resolve().then(() => {
			this[$state] = Init;
			this[$cp].send('cancelCommunication', {
				reason: {
					name: opt.reason.name,
					message: opt.reason.message
				}
			});
		});
	}

	gotAnswer(opt) {
		return this[$cp].send('gotAnswer', {answer: opt.answer}).then(() => true);
	}

	gotOffer(opt) {
		if (this[$state] !== WaitingForOffer) { throw new Error(`cannot receive offer in state ${this[$state].toString()}`); }
		return this[$cp].send('gotOffer', {offer: opt.offer}).then(() => true);
	}

	gotIce(opt) {
		return this[$cp].send('gotIceCandidates', {iceCandidates: opt.iceCandidates}).then(() => true);
	}



}

export default Webroulette;
