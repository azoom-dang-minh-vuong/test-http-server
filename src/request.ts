import type http from 'http'
import net from 'net'
import { Readable } from 'stream'
import { methods, methodsHasBody, newLine } from './const'
import type { Client } from './client'
import { getResponseFromBuffer, Response } from './response'

const kSendRequestFn = Symbol('sendRequest')
interface CreateRequestOptions {
  method: (typeof methods)[number]
  path: string
  client: Client
}

export class Request implements Promise<Response> {
  private client: Client
  private _body: Buffer | Readable | null = null
  readonly method: (typeof methods)[number]
  readonly url: URL
  readonly headers: http.IncomingHttpHeaders = {
    'user-agent': 'test-agent',
    host: 'localhost',
  }

  constructor(option: CreateRequestOptions) {
    this.client = option.client
    this.method = option.method
    this.url = new URL(option.path, 'http://localhost')
  }
  // @ts-ignore
  set(field: string, val: string | string[]): this
  // @ts-ignore
  set(field: object): this
  set(param1: string | object, param2?: string | string[]) {
    if (typeof param1 === 'string') {
      appendToHeaders(this.headers, param1, param2)
    } else {
      for (const key in param1) {
        appendToHeaders(this.headers, key, param1[key])
      }
    }
    return this
  }
  // @ts-ignore
  query(key: string, value: any): this
  // @ts-ignore
  query(q: URLSearchParams): this
  // @ts-ignore
  query(q: object): this
  query(key: string | object | URLSearchParams, value?: any) {
    if (typeof key === 'string') {
      this.url.searchParams.append(key, String(value))
    } else if (key instanceof URLSearchParams) {
      key.forEach((value, key) => {
        this.url.searchParams.append(key, value)
      })
    } else if (typeof key === 'object') {
      for (const k in key) {
        this.url.searchParams.append(k, key[k])
      }
    }
    return this
  }

  send(body: string | object | Buffer | Readable) {
    // check if request method is not include body then throw error
    if (!methodsHasBody.includes(this.method as any)) {
      throw new Error(`Request method "${this.method}" does not support body`)
    }
    let data: Request['_body'] = null
    if (body instanceof Buffer || body instanceof Readable) {
      data = body
    } else if (typeof body === 'string') {
      data = Buffer.from(body, 'utf-8')
    } else if (typeof body === 'object') {
      this.set('Content-Type', 'application/json; charset=utf-8')
      data = Buffer.from(JSON.stringify(body), 'utf-8')
    }
    this._body = data
    if (data instanceof Buffer) this.set('Content-Length', String(Buffer.byteLength(data)))
    return this
  }

  private async [kSendRequestFn]() {
    const { client } = this
    await client.promise
    return new Promise<Response>((resolve, reject) => {
      // Client socket
      const socket = new net.Socket()
      getResponseFromClientSocket(socket, resolve, reject)
      socket.connect(client.socketPath, () => {
        writeRequestToClientSocket(socket, this)
      })
    })
  }

  // Implements Promise
  then<TResult1 = any, TResult2 = never>(
    onFulfilled: (res: Response) => TResult1 | PromiseLike<TResult1>,
    onRejected?: (reason: any) => TResult2 | PromiseLike<TResult2>
  ) {
    return this[kSendRequestFn]().then(onFulfilled, onRejected)
  }
  catch<TResult = never>(onRejected: (reason: any) => TResult | PromiseLike<TResult>) {
    return this[kSendRequestFn]().catch(onRejected)
  }
  finally(onFinally?: () => void) {
    return this[kSendRequestFn]().finally(onFinally)
  }
  [Symbol.toStringTag] = 'Request'
}

function writeRequestToClientSocket(socket: net.Socket, request: Request) {
  // @ts-ignore
  const { _body: body } = request
  const url = new URL(request.url, 'http://localhost')
  const path = url.pathname + url.search
  socket.write(Buffer.from(`${request.method.toUpperCase()} ${path} HTTP/1.1` + newLine))
  for (const key in request.headers) {
    const currentVal = request.headers[key]
    const values = Array.isArray(currentVal) ? currentVal : [currentVal]
    values.forEach(val => {
      socket.write(Buffer.from(`${key}: ${val}` + newLine))
    })
  }
  socket.write(newLine)
  // check if request method is not include body then finish request
  if (!methodsHasBody.includes(request.method as any)) {
    socket.end()
  } else {
    if (body instanceof Buffer) {
      socket.end(body)
    } else if (body instanceof Readable) {
      body.pipe(socket)
    }
  }
}

function getResponseFromClientSocket(
  socket: net.Socket,
  resolve: (res: Response) => void,
  reject: (err: Error) => void
) {
  const responseChunks: Buffer[] = []
  socket.on('data', chunk => {
    responseChunks.push(chunk)
  })
  socket.on('end', () => {
    const responseBuffer = Buffer.concat(responseChunks)
    resolve(getResponseFromBuffer(responseBuffer))
  })
  socket.on('error', reject)
}

function appendToHeaders(headers: http.IncomingHttpHeaders, key: string, val: string | string[]) {
  key = key.toLowerCase()
  let currentVal = headers[key]
  if (Array.isArray(currentVal)) {
    currentVal = currentVal.concat(val)
  } else if (currentVal) {
    currentVal = [currentVal].concat(val)
  } else {
    currentVal = val
  }
  headers[key] = currentVal
}
