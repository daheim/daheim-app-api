import 'babel-core/polyfill';
import Promise from 'bluebird';

Promise.noConflict();

if (global.localStorage && typeof global.localStorage.debug === 'string' && global.localStorage.debug.indexOf('stack') !== -1) {
	require('source-map-support').install();
}

require('./core');
require('./third');
require('./ready');
require('./directives');
