import '../../src/server/bootstrap';
import chai from 'chai';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import supertest from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';

chai.should();

process.env.SECRET = 'verysecret';

global.proxyquire = proxyquire;
global.sinon = sinon;
global.supertest = supertest;

global.createApp = function(router) {
	let app = express();
	app.use(bodyParser.json());
	app.use(router);
	return app;
};
