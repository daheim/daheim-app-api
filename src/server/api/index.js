import {Router} from 'express';

import {User} from '../model';
import tokenHandler from '../token_handler';

export class Api {

	constructor() {
		this.router = Router();
		this.router.post('/register', this.handler(this.register));
		this.router.post('/login', this.handler(this.login));
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


	handler(fn) {
		return async function(reqIgnored, res, next) {
			try {
				let result = await fn.apply(this, arguments);
				res.send(result);
			} catch (err) {
				next(err);
			}
		};
	}

}

export default new Api();
