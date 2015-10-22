import 'babel-core/polyfill';
import Promise from 'bluebird';

Promise.noConflict();
require('source-map-support').install();

require('./core');
require('./second');
require('./third');
require('./ready');
