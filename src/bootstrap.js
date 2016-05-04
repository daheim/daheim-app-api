import 'babel-polyfill';
import SourceMapSupport from 'source-map-support';
import Promise from 'bluebird';
import bcrypt from 'bcryptjs';

SourceMapSupport.install();

Promise.config({
	longStackTraces: true,
	warnings: process.env.NODE_ENV === 'development',
});

process.on('unhandledRejection', function(reason) {
	console.error('Unhandled rejection:', reason.stack); // eslint-disable-line no-console
});

Promise.promisifyAll(bcrypt);
