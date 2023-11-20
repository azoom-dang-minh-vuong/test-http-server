# `@azoom-dang-minh-vuong/test-http-server`
> A simple module for http server testing purpose
> Can use for both CommonJS and ES6 module

## 1. Install

- Add this line to `.npmrc`
```
@azoom-dang-minh-vuong:registry=https://npm.pkg.github.com/
```

- Install package by yarn

```sh
yarn add -D @azoom-dang-minh-vuong/test-http-server
```

## 2. Usage

### Initialize Client

```javascript
import http from 'http';
import { Client } from '@azoom-dang-minh-vuong/test-http-server';

const requestListener = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World');
};

// Test HTTP Server
const server = http.createServer(requestListener);
const client = new Client(server);

// OR Test HTTP Server Request Listener
const client = new Client(requestListener);

// Close server after all tests
afterAll(async () => {
  await client.close();
});
```

### Client Usage

```javascript
const response1 = await client
  .get('/users?name=John&age=20')
  .query({ // <-- Set query string by object
    name: 'John',
    age: 20,
  });
  .set({ // <-- Set request header by object
    'authorization': 'Bearer ' + token,
    'accept': 'application/json'
  })

const response2 = await client
  .put('/users')
  .query('force', 'true') // <-- Set query string by key-value
  .set('authorization', 'Bearer ' + token) // <-- Set request header by key-value
  .send({ // <-- Set request body, auto set 'Content-Type' to 'application/json', auto stringify object and set 'Content-Length'
    name: 'John',
    age: 20,
  });

const response3 = await client
  .post('/users')
  .query(new URLSearchParams({ test: '123' })) // <-- Set query string by URLSearchParams
  .set('authorization', 'Bearer ' + token)
  .send('Hello World'); // <-- Set request body, auto set 'Content-Length'
  .send(
    Buffer.from('Hello World'), // <-- Set request body, auto set 'Content-Length'
  )
  .send(
    fs.createReadStream('file.txt'), // <-- Set request body by Stream.Readable
  );
```

### Response Interface

```typescript
interface Response {
  readonly statusCode: number
  readonly status: number
  readonly statusMessage: string
  readonly headers: http.OutgoingHttpHeaders
  readonly charset: BufferEncoding
  readonly contentType: string
  readonly body: string | object | Buffer
}
```

## 3. Advanced Usage

### Extends `Request` class

```javascript
import { Client, Request, CreateRequestOptions } from '@azoom-dang-minh-vuong/test-http-server';

class MyRequest extends Request {
  constructor(options: CreateRequestOptions) {
    super(options);
    // ...
  }

  setCredentials(username: string, password: string) {
    this.set('authorization', 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'));
  }
}
class MyClient extends Client {
  getRequestClass() {
    return MyRequest;
  }
}

const client = new MyClient(server);
```
