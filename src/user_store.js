import validator from 'validator';
import uuid from 'node-uuid';
import _ from 'lodash';

import createDebug from 'debug';
let debug = createDebug('dhm:userStore');

const $azure = Symbol('azure');

export default class UserStore {

	constructor({azure}) {
		this[$azure] = azure;
	}

	async createUserWithEmail(email) {
		let isEmail = validator.isEmail(email);
		if (!isEmail) { throw new Error('not email'); }

		let normal = email.toLowerCase();

		let id = uuid.v4();
		let data = {
			email: email,
			emailNormal: normal,
			joined: new Date().getTime()
		};

		debug('creating user email=%s userId=%s', normal, id);

		let emailEntity;
		emailEntity = await this.retrieveOrNull('Emails', normal, '');
		if (emailEntity && emailEntity.UserId) {
			debug('email entity already exists userId=%s', emailEntity.UserId._);
			let userEntity = await this.retrieveOrNull('Users', emailEntity.UserId._, '');
			if (userEntity) {
				throw new Error('email already has a user');
			}
		}

		debug('inserting user');
		await this[$azure].tables.insertEntityAsync('Users', {
			PartitionKey: this[$azure].ent.String(id),
			RowKey: this[$azure].ent.String(''),
			Data: this[$azure].ent.String(JSON.stringify(data))
		});

		try {
			debug('inserting email');
			await this.optimisticInsert('Emails', {
				PartitionKey: this[$azure].ent.String(normal),
				RowKey: this[$azure].ent.String(''),
				UserId: this[$azure].ent.String(id)
			}, emailEntity);
		} catch (err) {
			debug('email insert failed', err);
			this[$azure].tables.deleteEntityAsync('Users', id, '').suppressUnhandledRejections();
			throw err;
		}

		return id;
	}

	async getProfile(id) {
		let entity = await this[$azure].tables.retrieveEntityAsync('Users',id, '');
		return JSON.parse(entity.Data._).profile;
	}

	async updateProfile(id, {name, languages, topics}) {
		let LEVELS = {
			none: 1,
			beginner: 1,
			intermediate: 1,
			advanced: 1,
			native: 1
		};

		if (typeof name !== 'string') { throw new Error('name must be string'); }
		if (name.length < 2 || name.length > 128) { throw new Error('name length must be between 2 and 128'); }
		if (!Array.isArray(languages)) { throw new Error('languages must be an array'); }
		if (languages.length < 2 || languages.length > 10) { throw new Error('number of language must be between 2 and 10'); }
		let sanitizedLanguages = languages.map(({language, level}) => {
			if (typeof language !== 'string') { throw new Error('language must be a string'); }
			if (language.length < 2 || language.length > 128) { throw new Error('length of language must be between 2 and 128'); }
			if (typeof level !== 'string') { throw new Error('level must be a string'); }
			if (!LEVELS[level]) { throw new Error('invalid level'); }
			return {language, level};
		});
		if (!Array.isArray(topics)) { throw new Error('topics must be an array'); }
		if (topics.length > 20) { throw new Error('number of topcs must be at most 20'); }
		for (let topic of topics) {
			if (typeof topic !== 'string') { throw new Error('topic must be a string'); }
		}

		let result = await this.optimisticMerge('Users',id, '', entity => {
			let data = JSON.parse(entity.Data._);
			data.profile = {name, topics, languages: sanitizedLanguages};
			return {Data: this[$azure].ent.String(JSON.stringify(data))};
		});
		return JSON.parse(result.Data._).profile;
	}

	async loadUserWithEmail(email) {
		let isEmail = validator.isEmail(email);
		if (!isEmail) { throw new Error('not email'); }

		let normal = email.toLowerCase();
		try {
			let emailEntity = await this[$azure].tables.retrieveEntityAsync('Emails', normal, '');
			if (!emailEntity.UserId) {
				return;
			}
			let userEntity = await this[$azure].tables.retrieveEntityAsync('Users', emailEntity.UserId._, '');
			return userEntity;
		} catch (err) {
			if (err.code === 'ResourceNotFound') {
				return;
			}
			// TODO: filter not exists
			throw err;
		}
	}

	optimisticInsert(table, data, old) {
		if (old) {
			data['.metadata'] = data['.metadata'] || {};
			data['.metadata'].etag = old['.metadata'].etag;
			return this[$azure].tables.mergeEntityAsync(table, data);
		} else {
			return this[$azure].tables.insertEntityAsync(table, data);
		}
	}

	async optimisticMerge(table, partitionKey, rowKey, callback) {
		let entity = await this[$azure].tables.retrieveEntityAsync(table, partitionKey, rowKey);
		let fields = await callback(entity);
		let merge = await this[$azure].tables.mergeEntityAsync(table, _.assign({
			PartitionKey: entity.PartitionKey,
			RowKey: entity.RowKey,
			'.metadata': {etag: entity['.metadata'].etag}
		}, fields));
		return _.assign(entity, fields, merge);
	}

	retrieveOrNull() {
		return this[$azure].tables.retrieveEntityAsync.apply(this[$azure].tables, arguments).catch(err => {
			if (err.code === 'ResourceNotFound') { return null; }
			throw err;
		});
	}

}
