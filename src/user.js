import express from 'express';
import validator from 'validator';
import uuid from 'node-uuid';

import createDebug from 'debug';
let debug = createDebug('dhm:user');

const $postRegister = Symbol('postRegister');

const $router = Symbol('router');
const $userStore = Symbol('userStore');
const $tokenHandler = Symbol('tokenHandler');

export default class User {

	constructor({userStore, tokenHandler}) {
		this[$userStore] = userStore;
		this[$tokenHandler] = tokenHandler;
		let router = this[$router] = express.Router();

		router.post('/register', bind(this, this[$postRegister]));
	}

	get router() { return this[$router]; }

	async [$postRegister](req, res, next) {
		try {
			let user = await this[$userStore].loadUserWithEmail(req.body.email);
			if (user) {
				return res.send({state: 'registered', hasPassword: false});
			}

			let id = await this[$userStore].createUserWithEmail(req.body.email);
			return res.send({state: 'new', accessToken: this[$tokenHandler].issueForUser(id)});
		} catch (err) {
			next(err);
		}
	}




}

function bind(self, fn) {
	return function() {
		fn.apply(self, arguments);
	};
}
