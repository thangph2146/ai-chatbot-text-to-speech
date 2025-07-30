import { NextRequest } from 'next/server'
import { POST } from '../route'
import handleDifyChat from '@/service/dify/dify-service'

// Mock the dify service
jest.mock('@/service/dify/dify-service', () => jest.fn())

const mockHandleDifyChat = handleDifyChat as jest.MockedFunction<typeof handleDifyChat>

describe('/api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle successful chat request', async () => {
    // Mock handleDifyChat to simulate successful behavior
    mockHandleDifyChat.mockImplementation(async (req, res) => {
      res.status(200).json({ message: 'Success' })
    })

    // Create mock request
    const mockRequest = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello, how are you?' }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Call the API route
    const response = await POST(mockRequest)

    // Assertions
    expect(mockHandleDifyChat).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { message: 'Hello, how are you?' },
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' })
      }),
      expect.any(Object)
    )
    expect(response.status).toBe(200)
    const responseData = await response.json()
    expect(responseData).toEqual({ message: 'Success' })
  })

  it('should handle errors from dify service', async () => {
    // Mock handleDifyChat to simulate error behavior
    mockHandleDifyChat.mockImplementation(async (req, res) => {
      res.status(500).json({ error: 'Internal Server Error' })
    })

    // Create mock request
    const mockRequest = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Test message' }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Call the API route
    const response = await POST(mockRequest)

    // Assertions
    expect(mockHandleDifyChat).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { message: 'Test message' },
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' })
      }),
      expect.any(Object)
    )
    expect(response.status).toBe(500)
  })

  it('should handle dify service throwing an exception', async () => {
    // Mock service throwing an error
    mockHandleDifyChat.mockRejectedValue(new Error('Service unavailable'))

    // Create mock request
    const mockRequest = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Test message' }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Call the API route and expect it to throw
    await expect(POST(mockRequest)).rejects.toThrow('Service unavailable')
    expect(mockHandleDifyChat).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        body: { message: 'Test message' },
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      }),
      expect.any(Object)
    )
  })
})