import Promise from 'bluebird';
import EventEmitter from 'events';
import {WhitelistReceiver} from '../../ozora';
import WebRTC from 'webrtc-adapter-test';
import IceGatherer from './ice_gatherer';
import uuid from 'node-uuid';
import createDebug from 'debug';

let debug = createDebug('dhm:localheim:client');

const $streamGuard = Symbol();
const $negotiator = Symbol();
const $members = Symbol();
const $partner = Symbol();
const $me = Symbol();
const $closed = Symbol();
const $ozora = Symbol();
const $callbackObjectId = Symbol();
const $interface = Symbol();
const $state = Symbol();

const $setMembers = Symbol();
const $setState = Symbol();

export default class LocalheimClient extends EventEmitter {
	constructor({ozora, streamGuard}) {
		super();
		WhitelistReceiver.mixin(this, ['onMatch', 'onNegotiate', 'onRenegotiate', 'onRelay', 'onClose']);

		this[$ozora] = ozora;
		this[$ozora].on('disconnect', () => this.close({reason: 'ozora-gone'}));

		this[$streamGuard] = streamGuard;
		this[$streamGuard].on('close', () => this.close({reason: 'stream-gone'}));

		this[$callbackObjectId] = this[$ozora].register(this);

		this[$state] = 'connecting';
	}

	get callbackObjectId() { return this[$callbackObjectId]; }
	get members() { return this[$members]; }
	get partner() { return this[$partner]; }
	get me() { return this[$me]; }

	get state() { return this[$state]; }
	get remoteStream() { return this[$negotiator] ? this[$negotiator].remoteStream : undefined; }

	static createAndStart({ozora, streamGuard}) {
		let localheimClient = new LocalheimClient({ozora, streamGuard});
		(async () => {
			try {
				let zero = ozora.getObject(0);
				let id = await zero.invoke('createEncounter', {callbackId: localheimClient.callbackObjectId});
				await localheimClient.start(id);
			}	catch (err) {
				debug('cannot start', err);
				localheimClient.close({reason: 'protocol-error'});
			}
		})();
		return localheimClient;
	}

	[$setState](state) {
		if (this[$state] === state) { return debug('trying to set same state %s', state); }
		this[$state] = state;
		this.emit('stateUpdate');
	}

	async start(interfaceObjectId) {
		if (this[$closed]) { return; }

		if (this[$interface]) { throw new Error('already started'); }
		this[$interface] = this[$ozora].getObject(interfaceObjectId);
		this[$interface].on('disconnect', () => this.close({reason: 'disconnected'}));

		let startType = await this[$interface].invoke('start');
		if (this[$state] === 'connecting') {
			this[$setState]('need-partner');
		}
		debug('started with %s', startType);
		return startType;
	}

	[$setMembers](members) {
		for (let member of members) {
			if (member.self) {
				this[$me] = member;
			} else {
				this[$partner] = member;
			}
		}
	}

	async accept() {
		if (this[$state] !== 'match') { return debug('trying to accept in state %s', this[$state]); }
		this[$setState]('accepted');
		try {
			return await this[$interface].invoke('accept');
		} catch (err) {
			debug('accept error', err);
			this.close({reason: 'protocol-error'});
		}
	}

	onMatch({members}) {
		if (this[$closed]) { return; }
		this[$setMembers](members);
		this[$setState]('match');
	}

	onNegotiate({members, iceServers}) {
		if (this[$closed]) { return; }
		if (members) {
			this[$setMembers](members);
		}
		this[$negotiator] = new Negotiator({
			iceServers,
			streamGuard: this[$streamGuard],
			localheim: this,
			participant: this.partner.id,
			session: this.partner.session,
			initiator: this.partner.id > this.me.id
		});
		this[$negotiator].start();
		this[$setState]('negotiate');
	}

	onRenegotiate({iceServers, partner}) {
		if (this[$closed]) { return; }
		if (this.partner.id !== partner) { throw new Error('partner id mismatch'); }
		if (this[$negotiator]) {
			let oldNegotiator = this[$negotiator];
			delete this[$negotiator];
			oldNegotiator.close({reason: 'renegotiate'});
		}
		this[$negotiator] = new Negotiator({
			iceServers,
			streamGuard: this[$streamGuard],
			localheim: this,
			participant: this.partner.id,
			session: this.partner.session,
			initiator: this.partner.id > this.me.id
		});
		this[$negotiator].start();
		this[$setState]('negotiate');
	}

	onClose({reason}) {
		if (this[$closed]) { return; }
		delete this[$interface];
		this.close({reason});
	}

	onRelay(opt) {
		if (this[$negotiator]) {
			return this[$negotiator].onRelay(opt);
		} else {
			throw new Error('why are you bothering me?');
		}
	}

	async onNegotiatorClose(negotiator, reason) { // eslint-disable-line no-unused-vars
		if (negotiator !== this[$negotiator]) { return; }
		delete this[$negotiator];

		this[$setState]('partner-reconnect');
	}

	onNegotiatorConnected(negotiator) {
		if (negotiator !== this[$negotiator]) { return; }
		if (this[$state] !== 'negotiate') { return debug('trying to onNegotiatorConnected in state %s', this[$state]); }
		this[$setState]('connected');
	}

	onNegotiatorStream(negotiator, stream) {
		if (negotiator !== this[$negotiator]) { return; }
		this.emit('remoteStream', stream);
	}

	close({reason}) {
		if (this[$closed]) { return; }
		this[$closed] = true;

		debug('close: %s', reason);

		this[$setState]('closed');
		this.emit('close', reason);
		this.removeAllListeners();

		if (this[$interface]) {
			this[$interface].invoke('close', {reason}).catch(x=>x);
		}
		if (this[$negotiator]) {
			this[$negotiator].close({reason});
		}
		this[$ozora].unregister(this[$callbackObjectId]);
	}
}

const $iceServers = Symbol();
const $localheim = Symbol();
const $participant = Symbol();
const $session = Symbol();
const $initiator = Symbol();
const $pc = Symbol();
const $negotiationId = Symbol();
const $iceGatherer = Symbol();
const $connectedSent = Symbol();
const $remoteStream = Symbol();

class Negotiator {

	constructor({iceServers, localheim, participant, session, initiator, streamGuard}) {
		this[$iceServers] = iceServers;
		this[$localheim] = localheim;
		this[$participant] = participant;
		this[$session] = session;
		this[$initiator] = initiator;
		this[$streamGuard] = streamGuard;
	}

	get remoteStream() { return this[$remoteStream]; }

	start() {
		if (this[$pc]) { throw new Error('already started'); }

		this[$streamGuard].on('close', () => this.close({reason: 'stream_closed'}));

		this[$iceGatherer] = new IceGatherer();
		this[$iceGatherer].on('send', async ({iceCandidates, iceComplete}) => {
			debug('sending ice complete=%s', iceComplete, iceCandidates);
			try {
				await this[$localheim][$interface].invoke('sendRelay', {
					participant: this[$participant],
					session: this[$session],
					message: {
						type: 'ice',
						negotiationId: this[$negotiationId],
						candidates: iceCandidates,
						complete: iceComplete
					}
				});
			} catch (err) {
				this.close({reason: 'error', error: err});
			}
		});

		this[$pc] = new WebRTC.RTCPeerConnection({
			iceServers: this[$iceServers]
		});
		this[$pc].onicecandidate = e => this[$iceGatherer].add(e.candidate);
		this[$pc].onaddstream = e => {
			this[$remoteStream] = e.stream;
			this[$localheim].onNegotiatorStream(this, e.stream);
		};
		this[$pc].oniceconnectionstatechange = e => {
			let state = e.target.iceConnectionState;
			debug('ICE %s', state);
			if (state === 'connected' || state === 'completed') {
				if (!this[$connectedSent]) {
					this[$connectedSent] = true;
					this[$localheim].onNegotiatorConnected(this);
				}
			} else if (state === 'failed' || state === 'closed' || state === 'disconnected') {
				this.close({reason: 'disconnected', state});
			}
		};
		this[$pc].addStream(this[$streamGuard].stream);

		if (this[$initiator]) {
			this[$negotiationId] = uuid.v4();
			debug('creating offer');
			(async () => {
				try {
					let desc = await this[$pc].createOffer();
					await this[$pc].setLocalDescription(desc);
					await this[$localheim][$interface].invoke('sendRelay', {
						participant: this[$participant],
						session: this[$session],
						message: {
							type: 'offer',
							negotiationId: this[$negotiationId],
							sdp: desc.sdp
						}
					});
					this[$iceGatherer].ready();
				} catch (err) {
					debug('offer error', err);
					this.close({reason: 'error', error: err});
				}
			})();
		}
	}

	async onRelay({message}) {
		if (this[$closed]) { throw new Error('negotiator closed'); }

		if (message.type === 'offer') {
			if (this[$initiator]) { throw new Error('got offer as an initiator'); }
			if (this[$negotiationId]) { throw new Error('already got offer'); }

			debug('received offer, creating answer');
			this[$negotiationId] = message.negotiationId;
			let desc = new RTCSessionDescription({sdp: message.sdp, type: 'offer'});
			await this[$pc].setRemoteDescription(desc);
			this[$iceGatherer].ready();

			(async () => {
				try {
					let desc = await this[$pc].createAnswer();
					await this[$pc].setLocalDescription(desc);
					await this[$localheim][$interface].invoke('sendRelay', {
						participant: this[$participant],
						session: this[$session],
						message: {
							type: 'answer',
							negotiationId: this[$negotiationId],
							sdp: desc.sdp
						}
					});
				} catch (err) {
					debug('answer error', err);
					this.close({reason: 'error', error: err});
				}
			})();

		} else if (message.type === 'answer') {
			if (!this[$initiator]) { throw new Error('got answer as an initiator'); }
			if (!this[$negotiationId]) { throw new Error('got answer before offer'); }
			if (this[$negotiationId] !== message.negotiationId) { throw new Error('invalid negotiation id'); }

			debug('received answer');
			let desc = new RTCSessionDescription({sdp: message.sdp, type: 'answer'});
			await this[$pc].setRemoteDescription(desc);
		} else if (message.type === 'ice') {
			if (!this[$negotiationId]) { throw new Error('got ice before offer'); }
			if (this[$negotiationId] !== message.negotiationId) { throw new Error('invalid negotiation id'); }

			debug('received ICE candidates complete=%s', message.complete, message.candidates);
			let result = await Promise.map(message.candidates, async candidate => {
				try {
					await this[$pc].addIceCandidate(new RTCIceCandidate(candidate));
				} catch (err) {
					return {
						candidate,
						error: err
					};
				}
			});
			result = result.filter(x => x);
			if (result.length) {
				debug('ICE candidate errors', result);
				throw new Error('cannot add ICE candidates: ' + JSON.stringify(result));
			}
		} else {
			throw new Error('unknown message type');
		}
	}

	close({reason}) {
		if (this[$closed]) { return; }
		this[$closed] = true;

		debug('Negotiator close: %s', reason);

		if (this[$pc] && this[$pc].signalingState !== 'closed') {
			debug('closing RTCPeerConnection');
			this[$pc].close();
		}
		this[$localheim].onNegotiatorClose(this, reason);
		delete this[$localheim];
	}

}
