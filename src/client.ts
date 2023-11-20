import http from 'http'
import crypto from 'crypto'
import { methods } from './const'
import { CreateRequestOptions, Request } from './request'

export { CreateRequestOptions, Request }
export { Response } from './response'

interface MakeRequest {
  (this: Client, path: string): Request
}

export class Client implements Record<(typeof methods)[number], MakeRequest> {
  // @ts-ignore
  get(path: string): InstanceType<ReturnType<this['getRequestClass']>>
  // @ts-ignore
  post(path: string): InstanceType<ReturnType<this['getRequestClass']>>
  // @ts-ignore
  put(path: string): InstanceType<ReturnType<this['getRequestClass']>>
  // @ts-ignore
  patch(path: string): InstanceType<ReturnType<this['getRequestClass']>>
  // @ts-ignore
  delete(path: string): InstanceType<ReturnType<this['getRequestClass']>>
  // @ts-ignore
  head(path: string): InstanceType<ReturnType<this['getRequestClass']>>
  // @ts-ignore
  options(path: string): InstanceType<ReturnType<this['getRequestClass']>>
  // @ts-ignore
  connect(path: string): InstanceType<ReturnType<this['getRequestClass']>>

  readonly server: http.Server
  readonly socketPath: string
  readonly promise: Promise<void>

  constructor(app: http.RequestListener)
  // @ts-ignore
  constructor(server: http.Server)
  constructor(appOrServer: http.RequestListener | http.Server) {
    let server: http.Server
    if (typeof appOrServer === 'function') {
      server = http.createServer(appOrServer)
    } else if (appOrServer instanceof http.Server) {
      server = appOrServer
    } else {
      throw new TypeError('appOrServer must be a function or http.Server')
    }
    this.server = server
    const socketPath = `/tmp/${crypto.randomUUID()}.sock`
    this.socketPath = socketPath
    this.promise = new Promise((resolve, reject) => {
      if (server.listening) return resolve()
      server.on('error', reject)
      server.listen(socketPath, () => {
        resolve()
        server.off('error', reject)
      })
    })
  }

  async close() {
    await this.promise
    return new Promise<void>((resolve, reject) => {
      if (!this.server.listening) return resolve()
      this.server.close(err => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  /**
   * Can extends this method to customize request class
   */
  getRequestClass(): typeof Request {
    return Request
  }
}
methods.forEach(method => {
  Client.prototype[method] = function (path: string) {
    const RequestClass: typeof Request = this.getRequestClass()
    const request = new RequestClass({
      client: this,
      method,
      path,
    })
    return request
  }
})
