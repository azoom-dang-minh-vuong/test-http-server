import http from 'http'
import express from 'express'
import { Client, Request } from '../src/client'

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
client2.promise.then(() => {
  setTimeout(() => {
    client2
      .post('/users?id=1')
      .set('Authorization', 'Bearer 123')
      .set({
        test: ['a=1', 'b=2'],
      })
      .query({ id: 2 })
      .send({ name: 'John' })
      .then(res => {
        console.log('----res----', res)
        console.log('----res----', res.body)
        client2.close().then(() => {
          console.log('----server closed-----')
        })
      })
  })
})

class CustomRequest extends Request {

}

class CustomClient extends Client {
  getRequestClass() {
    return CustomRequest
  }
}
const server = http.createServer(app)

const customClient = new CustomClient(server)

customClient.get('/users').then(res => {
  console.log('----res----', res)
  console.log('----res----', res.body)
  customClient.close().then(() => {
    console.log('----server closed-----')
  })
})
