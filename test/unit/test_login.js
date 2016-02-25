import './bootstrap';
import mongoose from 'mongoose';

import {AuthError} from '../../src/server/model/user';
//import tokenHandler from '../../src/server/token_handler';

describe('Api', function() {

	const ID = mongoose.Types.ObjectId('4edd40c86762e0fb12000003');

	let api;
	let User;
	let tokenHandler;

	beforeEach(function() {
		User = sinon.stub();
		User.getAuthenticated = sinon.stub();
		User.prototype.save = sinon.stub();

		tokenHandler = {
			issueForUser: userId => `token:${userId}`,
			verifyAccessToken: token => token.substring(6),
		};

		api = proxyquire('../../src/server/api', {
			'../model': {User},
			'../token_handler': tokenHandler,
			'./encounter': {router: function() {}},
		}).default;
	});

	it('register', function() {
		User.getAuthenticated.throws(new AuthError('user not found'));
		User.prototype.save = function() { this.id = ID; };

		return supertest(createApp(api.router))
			.post('/register')
			.send({
				email: 'test@example.com',
				password: 'hello',
			})
			.expect(200)
			.expect(res => {
				res.body.result.should.be.equal('new');
				let userId = tokenHandler.verifyAccessToken(res.body.accessToken);
				userId.should.be.equal(ID.toString());
			});
	});

	it('login', function() {
		let user = new User();
		user.id = ID;

		User.getAuthenticated.returns(user);

		return supertest(createApp(api.router))
			.post('/register')
			.send({
				email: 'test@example.com',
				password: 'hello',
			})
			.expect(200)
			.expect(res => {
				res.body.result.should.be.equal('login');
				let userId = tokenHandler.verifyAccessToken(res.body.accessToken);
				userId.should.be.equal(ID.toString());
			});
	});

	it('fail', function() {
		User.getAuthenticated.throws(new AuthError('invalid password'));

		return supertest(createApp(api.router))
			.post('/register')
			.send({
				email: 'test@example.com',
				password: 'hello',
			})
			.expect(400)
			.expect(res => {
				res.body.error.should.be.equal('user_already_exists');
			});
	});

});
