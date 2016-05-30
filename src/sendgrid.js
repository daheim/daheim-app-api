import Bluebird from 'bluebird'
import createSendgrid from 'sendgrid'

const sendgrid = createSendgrid(process.env.SENDGRID_KEY)
Bluebird.promisifyAll(sendgrid)

export default sendgrid
