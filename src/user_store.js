import validator from 'validator';
import uuid from 'node-uuid';

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

	retrieveOrNull() {
		return this[$azure].tables.retrieveEntityAsync.apply(this[$azure].tables, arguments).catch(err => {
			if (err.code === 'ResourceNotFound') { return null; }
			throw err;
		});
	}

}
