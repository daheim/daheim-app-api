import {Router} from 'express';
import Promise from 'bluebird';
import createSendgrid from 'sendgrid';
import passport from 'passport';

import {User} from '../model';
import tokenHandler from '../token_handler';
import encounterApi from './encounter';

let sendgrid = createSendgrid(process.env.SENDGRID_KEY);
Promise.promisifyAll(sendgrid);

export class Api {

	constructor() {
		this.router = Router();
		this.router.post('/register', this.handler(this.register));
		this.router.post('/login', this.handler(this.login));
		this.router.post('/forgot', this.handler(this.forgot));
		this.router.post('/reset', passport.authenticate('reset', {session: false}), this.handler(this.reset));

		this.router.use('/encounters', encounterApi.router);

		this.router.get('*', (req, res) => res.status(404).send({error: 'not_found'}));
	}

	async register({body: {email, password}}, res) {
		try {
			let user = await User.getAuthenticated(email, password);
			return {
				result: 'login',
				accessToken: tokenHandler.issueForUser(user.id)
			};
		} catch (err) {
			if (err.name !== 'AuthError') {
				throw err;
			}

			if (err.message !== 'user not found') {
				res.status(400).send({error: 'user_already_exists'});
				return;
			}
		}

		// TODO: save newsletter information
		let user = new User({
			username: email,
			password,
		});
		await user.save();
		return {
			result: 'new',
			accessToken: tokenHandler.issueForUser(user.id)
		};
	}

	async login({body: {email, password}}, res) {
		try {
			let user = await User.getAuthenticated(email, password);
			return {
				result: 'login',
				accessToken: tokenHandler.issueForUser(user.id)
			};
		} catch (err) {
			if (err.name !== 'AuthError') {
				throw err;
			}

			res.status(401).send('Unauthorized');
		}
	}

	async forgot({body: {email}}, res) {
		let user = await User.findOne({username: email});
		if (!user) {
			res.status(400).send({error: 'user_not_found'});
			return;
		}

		let token = tokenHandler.issuePasswordResetToken(user.id);
		let address = user.username;
		let sg = new sendgrid.Email({
			to: address,
			from: 'daheim@mesellyounot.com',
			fromname: 'Daheim',
			subject: 'Daheim Password Reset',
			html: `Please click <a href="${process.env.URL}/auth/reset?token=${encodeURIComponent(token)}">here reset your password.</a>.`
		});
		await sendgrid.sendAsync(sg);
	}

	async reset({body: {password}, user}) {
		user.password = password;
		user.loginAttempts = 0;
		user.lockUntil = null;
		await user.save();

		return {
			accessToken: tokenHandler.issueForUser(user.id)
		};
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

export default new Api();
