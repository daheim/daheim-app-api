import {Strategy as JwtStrategy} from 'passport-jwt';
import jwt from 'jsonwebtoken';

import createDebug from 'debug';
let debug = createDebug('dhm:token');

const SECRETS = new WeakMap();
const $passport = Symbol('passport');

export default class TokenHandler {

	constructor({secret, passport}) {
		if (!secret) { throw new Error('secret must be defined'); }
		SECRETS[this] = secret;

		if (passport) {
			this[$passport] = passport;
			passport.use('jwt', new JwtStrategy({
				secretOrKey: SECRETS[this],
				authScheme: 'Bearer'
			}, function(jwt, done) {
				let user = {
					id: jwt.sub
				};
				return done(null, user);
			}));
		}
	}

	get auth() { return this[$passport].authenticate('jwt', {session: false}); }

	issueForUser(userId) {
		return jwt.sign({}, SECRETS[this], {subject: userId, audience: 'access'});
	}

	issueForLoginToken(loginToken) {
		let decoded = jwt.verify(loginToken, SECRETS[this], {audience: 'login', maxAge: '15m'});
		return this.issueForUser(decoded.sub);
	}

	issueLoginToken(userId) {
		return jwt.sign({}, SECRETS[this], {subject: userId, audience: 'login', expiresIn: '15m'});
	}

}
