import type http from 'http'
import { emptyLine } from './const'

export interface Response {
  readonly statusCode: number
  readonly statusMessage: string
  readonly headers: http.OutgoingHttpHeaders
  readonly body: string | object | Buffer
}

export function getResponseFromBuffer(buffer: Buffer): Response {
  const indexOfEmptyLine = buffer.indexOf(emptyLine)
  const header = buffer.slice(0, indexOfEmptyLine).toString()
  const body = buffer.slice(indexOfEmptyLine + emptyLine.length)
  const [statusLine, ...headersString] = header.split('\r\n')
  const [httpVersion, statusCode, ...statusMessage] = statusLine.split(' ')
  const headers = headersString.reduce(
    (acc, cur) => {
      const [key, value] = cur.split(': ')
      const keyLowerCase = key.toLowerCase()
      if (Array.isArray(acc[keyLowerCase])) {
        acc[keyLowerCase].push(value)
      } else acc[keyLowerCase] = value
      return acc
    },
    { __proto__: null }
  ) as http.OutgoingHttpHeaders
  Object.freeze(headers)
  return {
    statusCode: Number(statusCode),
    statusMessage: statusMessage.join(' '),
    headers,
    get body() {
      const contentType = Array.isArray(headers['content-type'])
        ? headers['content-type'][0]
        : String(headers['content-type'])
      const charset = (contentType.split(';')[1]?.split('=')[1]?.trim() ||
        'utf-8') as BufferEncoding
      if (contentType.includes('application/json')) {
        return JSON.parse(body.toString(charset))
      } else if (contentType.startsWith('text/')) {
        return body.toString(charset)
      } else {
        return body
      }
    },
  }
}
