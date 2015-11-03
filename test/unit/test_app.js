require('../../src/bootstrap');
var chai = require('chai');
var sinon = require('sinon');
var supertest = require('supertest');
var nock = require('nock');

var expect = chai.expect;
var should = chai.should();

var Promise = require('bluebird');
var util = require('util');
var zlib = require('zlib');

var log = require('../../src/log');
//var app = require('../../src/app').app;

describe('Web', function() {

	// it('default', function(done) {
	// 	supertest(app)
	// 		.get('/')
	// 		.expect(200, done);
	// });

});
