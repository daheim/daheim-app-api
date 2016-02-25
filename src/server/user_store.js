import {User} from './model';

import createDebug from 'debug';
let debug = createDebug('dhm:userStore');

const $azure = Symbol('azure');

export default class UserStore {

	constructor({azure}) {
		this[$azure] = azure;
	}

	async createUserWithEmail(emailIgnored) {
		throw new Error('createUserWithEmail is no longer supported');
	}

	async getProfile(id) {
		let user = await User.findById(id);
		if (!user) { throw new Error('user not found'); }
		return user.profile;
	}

	async updateProfile(id, {name, languages, topics}) {
		let user = await User.findById(id);
		if (!user) {
			throw new Error('user not found');
		}

		if (name !== undefined) { user.profile.name = name; }
		if (languages !== undefined) { user.profile.languages = languages; }
		if (topics !== undefined) { user.profile.topics = topics; }

		await user.save();
		debug('user %o profile updated', id);
	}

	async loadUserWithEmail(emailIgnored) {
		throw new Error('loadUserWithEmail is no longer supported');
	}

	uploadProfilePicture(userId, buffer) {
		if (typeof userId !== 'string') { throw new Error('userId must be defined'); }
		if (!(buffer instanceof Buffer)) { throw new Error('buffer must be defined'); }
		return this[$azure].blobs.createBlockBlobFromTextAsync('public', `users/${encodeURIComponent(userId)}/picture.png`, buffer, {
			contentType: 'image/png',
		});
	}
}
