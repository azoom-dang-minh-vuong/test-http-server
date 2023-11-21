import http from 'http'
import { Readable } from 'stream'
import { methods, methodsHasBody } from './const'
import type { Client } from './client'
import { parseBody, parseContentType, Response } from './response'

const kSendRequestFn = Symbol('sendRequest')
export const kHooksBeforeSend = Symbol('hooksBeforeSend')
export interface CreateRequestOptions {
  method: (typeof methods)[number]
  path: string
  client: Client
  hooksBeforeSend: ((req: Request) => any)[]
}

export class Request implements Promise<Response> {
  private client: Client
  private _body: Buffer | Readable | null = null
  private [kHooksBeforeSend]: ((req: Request) => any)[] = []
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
    this[kHooksBeforeSend] = option.hooksBeforeSend
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

  send(body?: string | object | Buffer | Readable) {
    if (body === undefined) return this
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
    return this
  }

  private async [kSendRequestFn]() {
    const { client, _body: body } = this
    await client.start()
    for (const fn of this[kHooksBeforeSend]) {
      await fn(this)
    }
    return new Promise<Response>((resolve, reject) => {
      const request = http
        .request(
          {
            socketPath: client.socketPath,
            headers: this.headers,
            path: this.url.pathname + this.url.search,
            method: this.method.toUpperCase(),
          },
          res => {
            getResponse(res, resolve, reject)
          }
        )
        .on('error', reject)
      if (methodsHasBody.includes(this.method as any) && body) {
        if (body instanceof Buffer) {
          request.end(body)
        } else if (body instanceof Readable) {
          body.pipe(request)
        } else request.end()
      } else {
        request.end()
      }
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

function getResponse(
  res: http.IncomingMessage,
  resolve: (res: Response) => void,
  reject: (err: Error) => void
) {
  const chunks: Buffer[] = []
  res.on('data', chunk => {
    chunks.push(chunk)
  })
  res.on('end', () => {
    const buffer = Buffer.concat(chunks)
    const { contentType, charset } = parseContentType(res.headers['content-type'] || '')
    resolve(
      Object.freeze({
        statusCode: res.statusCode,
        status: res.statusCode,
        statusMessage: res.statusMessage,
        contentType,
        charset,
        headers: res.headers,
        body: parseBody(buffer, contentType, charset),
      })
    )
  })
  res.on('error', reject)
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
