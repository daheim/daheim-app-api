import {Schema, default as mongoose} from 'mongoose';
import bcrypt from 'bcryptjs';
import BaseError from 'es6-error';

const SALT_WORK_FACTOR = 10;
const MAX_LOGIN_ATTEMPTS = 10;
const LOCK_TIME = 3 * 60 * 1000;

class AuthError extends BaseError {
	constructor(m) { super(m); }
}

let UserSchema = new Schema({
	username: {type: String, required: true, index: {unique: true}},
	password: {type: String, required: true},

	loginAttempts: {type: Number, required: true, default: 0},
	lockUntil: {type: Date},
});

UserSchema.virtual('isLocked').get(function() {
	return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.pre('save', async function(next) {
	let error;
	try {
		if (!this.isModified('password')) { return; }
		let salt = await bcrypt.genSaltAsync(SALT_WORK_FACTOR);
		this.password = await bcrypt.hashAsync(this.password, salt);
	} catch (err) {
		error = err;
	} finally {
		next(error);
	}
});

UserSchema.methods.comparePassword = function(candidatePassword) {
	return bcrypt.compareAsync(candidatePassword, this.password);
};

UserSchema.methods.incLoginAttempts = function() {
	if (this.lockUntil && this.lockUntil < Date.now()) {
		return this.update({
			$set: {loginAttempts: 1},
			$unset: {lockUntil: 1}
		});
	}

	let updates = {$inc: {loginAttempts: 1}};
	if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
		updates.$set = {lockUntil: new Date(Date.now() + LOCK_TIME)};
	}
	return this.update(updates);
};

UserSchema.statics.getAuthenticated = async function(username, password) {
	let user = await this.findOne({username});
	if (!user) { throw new AuthError('user not found'); }

	if (user.isLocked) {
		await user.incLoginAttempts();
		throw new AuthError('account locked');
	}

	if (!await user.comparePassword(password)) {
		await user.incLoginAttempts();
		throw new AuthError('invalid password');
	}

	if (user.loginAttempts || user.lockUntil) {
		await user.update({
			$set: {loginAttempts: 0},
			$unset: {lockUntil: 1},
		});
	}

	return user;
};

let User = mongoose.model('User', UserSchema);
export {User};

