import jwt from 'jsonwebtoken';

const SECRETS = new WeakMap();

export default class TokenHandler {

	constructor({secret}) {
		if (!secret) { throw new Error('secret must be defined'); }
		SECRETS[this] = secret;
	}

	issueForUser(userId) {
		return jwt.sign({}, SECRETS[this], {subject: userId});
	}

}
