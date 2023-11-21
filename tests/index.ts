import http from 'http'
import express from 'express'
import { Client, Request } from '../src/client'
import { Readable } from 'stream'

// test
const app = express()
app.use((req, res, next) => {
  console.log('-------req', req.method, req.url)
  console.log('-------req.headers', req.headers)
  next()
})
app.use(express.json())
app.post('/users', (req, res, next) => {
  console.log('-------req.body', req.body)
  // return next(new Error('test'))
  res.send({
    id: 1,
    ...req.body,
  })
})
app.get('/users', (req, res, next) => {
  console.log('-------req.query', req.query)
  res.send([
    {
      id: 1,
      name: 'John',
    },
  ])
})
app.use((err, req, res, next) => {
  console.log('-------err', err)
  res.status(500).send(err.message)
})

const client2 = new Client(app)
client2.onBeforeSend(async req => {
  console.log('-------req.headers from hook', req.headers)
  await new Promise(resolve => setTimeout(resolve, 1000))
})
setTimeout(async () => {
  const res = await client2
    .post('/users?id=1')
    .set('Authorization', 'Bearer 123')
    .set({
      test: ['a=1', 'b=2'],
    })
    .query({ id: 2 })
    .send({ name: 'John' })
  // .send(Buffer.from(JSON.stringify({ name: 'John' })))
  // .set('Content-Type', 'application/json; charset=utf-8')
  // .send(Readable.from(JSON.stringify({ name: 'John' })))
  console.log('----res----', res)
  await client2.close()
  console.log('----server closed-----')

  const res2 = await client2.get('/users').query({ id: 2 })
  console.log('----res2----', res2)
  await client2.close()
  console.log('----server closed-----')
})

class CustomRequest extends Request {}

class CustomClient extends Client {
  getRequestClass() {
    return CustomRequest
  }
}
const server = http.createServer(app)

const customClient = new CustomClient(server)
customClient.onBeforeSend(async req => {
  console.log('-------req.headers from hook 2', req.headers)
  await new Promise(resolve => setTimeout(resolve, 1000))
})

customClient.get('/users').then(res => {
  console.log('----res----', res)
  console.log('----res----', res.body)
  customClient.close().then(() => {
    console.log('----server closed-----')
  })
})
