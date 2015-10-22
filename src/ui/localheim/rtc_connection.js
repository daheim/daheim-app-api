import Promise from 'bluebird';
import EventEmitter from 'events';
import IceGatherer from './ice_gatherer';
import WebRTC from 'webrtc-adapter-test';
import createDebug from 'debug';

let debug = createDebug('dhm:rtc_connection');


const $stream = Symbol();
const $pc = Symbol();
const $client = Symbol();
const $iceGatherer = Symbol();
const $localDescriptionPromise = Symbol();
const $haveToSignal = Symbol();
const $connected = Symbol();
const $disconnected = Symbol();
const $initiator = Symbol();

const $startSignaling = Symbol();
const $localDescription = Symbol();

export default class RtcConnection extends EventEmitter {

	constructor({stream, client, initiator, iceServers = []}) {
		super();
		this[$client] = client;
		this[$stream] = stream;
		this[$initiator] = initiator;
		this[$haveToSignal] = initiator ? true : false;

		this[$iceGatherer] = new IceGatherer();
		this[$iceGatherer].on('send', ({iceCandidates, iceComplete}) => {
			this[$client].sendRelay({
				type: 'ice',
				iceCandidates,
				iceComplete
			});
		});

		this[$pc] = new WebRTC.RTCPeerConnection({iceServers});
		this[$pc].onicecandidate = e => this[$iceGatherer].add(e.candidate);
		this[$pc].onaddstream = e => this.emit('stream', e.stream);
		this[$pc].oniceconnectionstatechange = e => {
			let state = e.target.iceConnectionState;

			if (state === 'failed' || state === 'closed' || state === 'disconnected') {
				debug('ICE %s', state);
				if (state !== 'closed') {
					this[$pc].close();
				}
				if (!this[$disconnected]) {
					this[$disconnected] = true;
					this.emit('close');
				}
			} else if (state === 'connected' || state === 'completed') {
				debug('ICE connected');
				if (!this[$connected]) {
					this[$connected] = true;
					this.emit('connected');
				}
			} else if (state === 'checking') {
				// nothing
			} else {
				debug('unknown ICE state: %s', state);
			}
		};

		this[$pc].addStream(this[$stream]);
		debug('RtcConnection created initiator=%s', initiator);
	}

	async onRelay({message:msg}) {
		if (msg.type === 'sdp') {
			debug('received SDP');
			await this[$pc].setRemoteDescription(new RTCSessionDescription({sdp: msg.sdp, type: this[$initiator] ? 'answer' : 'offer'}));
			if (!this[$initiator]) {
				this[$haveToSignal] = true;
				this[$startSignaling]();
			}
			return true;
		} else if (msg.type === 'ice') {
			debug('received ICE candidates complete=%s', msg.iceComplete, msg.iceCandidates);
			await Promise.map(msg.iceCandidates, async candidate => {
				await this[$pc].addIceCandidate(new RTCIceCandidate(candidate));
			});
			return true;
		}
	}

	start() {
		this[$startSignaling]();
	}

	get [$localDescription]() {
		if (!this[$localDescriptionPromise]) {
			this[$localDescriptionPromise] = (async () => {
				debug('creating %s', this[$initiator] ? 'offer' : 'answer');
				let desc = this[$initiator] ? await this[$pc].createOffer() : await this[$pc].createAnswer();
				await this[$pc].setLocalDescription(desc);
				return desc;
			})();
		}
		return this[$localDescriptionPromise];
	}

	async [$startSignaling]() {
		if (!this[$haveToSignal]) { return; }

		let desc = await this[$localDescription];
		debug('sending SDP');
		await this[$client].sendRelay({
			type: 'sdp',
			sdp: desc.sdp
		});
		this[$haveToSignal] = false;
		this[$iceGatherer].ready();
	}

	close() {
		if (this[$pc].signalingState !== 'closed') {
			this[$pc].close();
		}
	}
}
