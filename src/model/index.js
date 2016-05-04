import mongoose from 'mongoose'

import log from '../log'

export {User} from './user'
export * from './encounter'

let mongooseUrl = 'mongodb://localhost/first'
if (process.env.MONGODB_URL) {
  mongooseUrl = process.env.MONGODB_URL
} else if (process.env.MONGODB_PORT_27017_TCP_PORT && process.env.MONGODB_PORT_27017_TCP_ADDR) {
  if (!process.env.MONGODB_DB_NAME || process.env.MONGODB_DB_NAME === '**ChangeMe**') {
    log.error('MONGODB_DB_NAME must be defined when mongodb is linked')
    process.exit(1)
  }
  mongooseUrl = 'mongodb://' + process.env.MONGODB_PORT_27017_TCP_ADDR + ':' + process.env.MONGODB_PORT_27017_TCP_PORT + '/' + process.env.MONGODB_DB_NAME
}

log.info({mongodbUrl: mongooseUrl}, 'connecting to MongoDB')
mongoose.connect(mongooseUrl, {
  server: {
    reconnectTries: Infinity,
  },
  db: {
    bufferMaxEntries: 0,
  },
}, function(err, connIgnored) {
  if (err) {
    log.error({err}, 'mongoose connect error: ', err.message)
    process.exit(1)
  }
  mongoose.connection.on('disconnected', err => {
    log.warn({err}, 'mongoose disconnected')
  })
})
mongoose.connection.on('connected', errIgnored => {
  log.info('mongoose connected')
})
