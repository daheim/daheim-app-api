import {Router} from 'express';

import tokenHandler from '../token_handler';
import {Encounter, User} from '../model';

const PING_THRESHOLD = 2.5 * 60 * 1000;

export class EncounterApi {

	constructor({tokenHandler}) {
		this.router = Router();
		this.router.use(tokenHandler.auth);
		this.router.get('/', this.handler(this.getEncounters));
	}

	async getEncounters({user}) {
		let encounters = await Encounter.find({'participants.userId': user.id}).sort('-date');

		let userMap = {};

		let result = encounters.map(encounter => {
			let me;
			let partner;

			encounter.participants.forEach(p => {
				if (p.userId === user.id) {
					me = p;
				} else {
					partner = p;
				}
			});

			let now = Date.now();
			let length = encounter.length;
			if (!length && encounter.ping < now - PING_THRESHOLD) {
				length = encounter.ping - encounter.date;
			}

			userMap[partner.userId] = false;

			return {
				id: encounter.id,
				date: encounter.date.getTime(),
				length,
				myReview: me.review,
				partnerReview: partner.review,
				partnerId: partner.userId,
			};
		});

		let users = await User.find({_id: {$in: Object.keys(userMap)}}).select('profile.name');
		for (let user of users) {
			userMap[user.id] = user.profile.name;
		}
		for (let encounter of result) {
			encounter.partnerName = userMap[encounter.partnerId];
		}

		return result;
	}

	handler(fn) {
		let self = this;
		return async function(reqIgnored, res, next) {
			try {
				let result = await fn.apply(self, arguments);
				res.send(result);
			} catch (err) {
				next(err);
			}
		};
	}

}

export default new EncounterApi({tokenHandler});
