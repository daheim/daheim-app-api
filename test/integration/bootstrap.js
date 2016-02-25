import '../../src/server/bootstrap';
import chai from 'chai';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import supertest from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';

global.proxyquire = proxyquire.noCallThru();
global.sinon = sinon;
global.supertest = supertest;
global.expect = chai.expect;
global.should = chai.should();
