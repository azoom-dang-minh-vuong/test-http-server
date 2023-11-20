export const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'connect'] as const

export const methodsHasBody = ['post', 'put', 'patch', 'delete'] as const

export const emptyLine = Buffer.from('\r\n\r\n')

export const newLine = Buffer.from('\r\n')

