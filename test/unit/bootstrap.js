import '../../src/server/bootstrap';
import chai from 'chai';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import supertest from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';

process.env.SECRET = 'verysecret';

global.proxyquire = proxyquire.noCallThru();
global.sinon = sinon;
global.supertest = supertest;
global.expect = chai.expect;
global.should = chai.should();

global.createApp = function(router) {
	let app = express();
	app.use(bodyParser.json());
	app.use(router);
	return app;
};
