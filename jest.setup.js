
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill for Node.js environment
Object.assign(global, { TextDecoder, TextEncoder })

// Mock TransformStream
Object.defineProperty(global, 'TransformStream', {
  value: class TransformStream {
    constructor() {
      this.readable = {
        getReader: () => ({
          read: () => Promise.resolve({ done: true, value: undefined })
        })
      }
      this.writable = {
        getWriter: () => ({
          write: jest.fn(),
          close: jest.fn()
        })
      }
    }
  }
})

// Mock ReadableStream
Object.defineProperty(global, 'ReadableStream', {
  value: class ReadableStream {
    constructor(underlyingSource) {
      this.underlyingSource = underlyingSource
      this.locked = false
    }
    
    getReader() {
      return {
        read: jest.fn(() => Promise.resolve({ done: true, value: undefined })),
        releaseLock: jest.fn()
      }
    }
    
    cancel() {
      return Promise.resolve()
    }
  }
})

// Mock fetch
global.fetch = jest.fn()

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}

// Mock Request and Response
Object.defineProperty(global, 'Request', {
  value: class Request {
    constructor(input, init) {
      Object.defineProperty(this, 'url', {
        value: input,
        writable: false
      })
      this.method = init?.method || 'GET'
      this.headers = new Headers(init?.headers)
      this.body = init?.body
    }
    
    async json() {
      return JSON.parse(this.body)
    }
  }
})

// Mock NextRequest specifically
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    constructor(input, init) {
      Object.defineProperty(this, 'url', {
        value: input,
        writable: false
      })
      this.method = init?.method || 'GET'
      this.headers = new Headers(init?.headers)
      this.body = init?.body
    }
    
    async json() {
      return JSON.parse(this.body)
    }
  },
  NextResponse: {
    json: (data, init) => new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers
      }
    })
  }
}))

Object.defineProperty(global, 'Response', {
  value: class Response {
    constructor(body, init) {
      this.body = body
      this.status = init?.status || 200
      this.ok = this.status >= 200 && this.status < 300
      this.headers = new Headers(init?.headers)
    }
    
    async text() {
      return this.body
    }
    
    async json() {
      return JSON.parse(this.body)
    }
  }
})

Object.defineProperty(global, 'Headers', {
  value: class Headers {
    constructor(init) {
      this.map = new Map()
      if (init) {
        if (init instanceof Headers) {
          init.forEach((value, key) => this.map.set(key, value))
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.map.set(key, value))
        } else {
          Object.entries(init).forEach(([key, value]) => this.map.set(key, value))
        }
      }
    }
    
    get(key) {
      return this.map.get(key)
    }
    
    set(key, value) {
      this.map.set(key, value)
    }
    
    forEach(callback) {
      this.map.forEach((value, key) => callback(value, key))
    }
  }
})

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/'
    }
  }
}))

// Mock environment variables
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000'
process.env.DIFY_API_KEY = 'test-api-key'
process.env.DIFY_BASE_URL = 'https://api.dify.ai'