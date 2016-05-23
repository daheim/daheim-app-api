import 'babel-polyfill'
import SourceMapSupport from 'source-map-support'
import './reporter'
import Bluebird from 'bluebird'
import bcrypt from 'bcryptjs'

require('babel-runtime/core-js/promise').default = Bluebird

SourceMapSupport.install()

Bluebird.config({
  longStackTraces: true,
  warnings: process.env.NODE_ENV === 'development'
})
Bluebird.promisifyAll(bcrypt)

process.on('unhandledRejection', function (reason) {
  console.error('Unhandled rejection:', reason.stack) // eslint-disable-line no-console
})

