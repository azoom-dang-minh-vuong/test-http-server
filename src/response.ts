import type http from 'http'

export interface Response {
  readonly statusCode: number
  readonly status: number
  readonly statusMessage: string
  readonly headers: http.OutgoingHttpHeaders
  readonly charset: BufferEncoding
  readonly contentType: string
  readonly body: string | object | Buffer
}

export function parseBody(buffer: Buffer, contentType: string, charset: BufferEncoding = 'utf-8') {
  if (contentType.startsWith('application/json')) {
    return JSON.parse(buffer.toString(charset))
  } else if (contentType.startsWith('text/')) {
    return buffer.toString(charset)
  } else {
    return buffer
  }
}

export function parseContentType(headerVal: string | string[]) {
  const contentTypeHeader =
    (Array.isArray(headerVal) ? headerVal[0] : String(headerVal)) || 'application/octet-stream'
  const contentType = contentTypeHeader.split(';')[0]
  const charset = (contentTypeHeader.split(';')[1]?.split('=')[1]?.trim() ||
    'utf-8') as BufferEncoding
  return { contentType, charset }
}
