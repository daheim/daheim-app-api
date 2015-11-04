import express from 'express';
import validator from 'validator';
import uuid from 'node-uuid';

import createDebug from 'debug';
let debug = createDebug('dhm:user');

const $postRegister = Symbol('postRegister');
const $postProfile = Symbol('postProfile');
const $getProfile = Symbol('getProfile');

const $router = Symbol('router');
const $userStore = Symbol('userStore');
const $tokenHandler = Symbol('tokenHandler');

export default class User {

	constructor({userStore, tokenHandler}) {
		this[$userStore] = userStore;
		this[$tokenHandler] = tokenHandler;
		let router = this[$router] = express.Router();

		router.post('/register', bind(this, this[$postRegister]));
		router.post('/profile', tokenHandler.auth, bind(this, this[$postProfile]));
		router.get('/profile', tokenHandler.auth, bind(this, this[$getProfile]));
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

	async [$getProfile](req, res, next) {
		res.send(await this[$userStore].getProfile(req.user.id));
	}

	async [$postProfile](req, res, next) {
		try {
			res.send(await this[$userStore].updateProfile(req.user.id, req.body));
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
