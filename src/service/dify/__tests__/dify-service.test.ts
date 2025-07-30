import { NextApiRequest, NextApiResponse } from 'next'
import handleDifyChat from '../dify-service'

// Mock node-fetch
jest.mock('node-fetch')
import fetch from 'node-fetch'
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('dify-service', () => {
  let mockRequest: Partial<NextApiRequest>
  let mockResponse: Partial<NextApiResponse>

  beforeEach(() => {
    jest.clearAllMocks()
    // Set up environment variables
    process.env.DIFY_API_BASE_URL = 'https://api.dify.ai'
    process.env.DIFY_API_KEY = 'test-api-key'

    // Mock request and response objects
    mockRequest = {
      body: {
        inputs: {},
        query: 'Hello',
        response_mode: 'streaming',
        conversation_id: '',
        user: 'test-user'
      }
    }

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      write: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('handleDifyChat', () => {
    it('should handle successful chat request', async () => {
      // Mock successful response
      const mockResponseData = {
        answer: 'Hello! How can I help you today?',
        conversation_id: 'conv-123',
        message_id: 'msg-456'
      }

      const mockStream = {
        pipe: jest.fn()
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream
      } as any)

      // Call the service
      await handleDifyChat(mockRequest as NextApiRequest, mockResponse as NextApiResponse)

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.dify.ai/v1/chat-messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
            'Accept': 'text/event-stream'
          })
        })
      )
    })

    it('should handle API error response', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request')
      } as Response)

      // Call the service
      await handleDifyChat(mockRequest as NextApiRequest, mockResponse as NextApiResponse)

      // Verify response status was set
      expect(mockResponse.status).toHaveBeenCalledWith(400)
    })

    it('should handle network errors', async () => {
      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'))

      // Call the service
      await handleDifyChat(mockRequest as NextApiRequest, mockResponse as NextApiResponse)

      // Verify error response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(500)
    })

    it('should handle missing environment variables', async () => {
      // Remove environment variables
      delete process.env.DIFY_API_KEY
      delete process.env.DIFY_API_BASE_URL

      // Call the service
      await handleDifyChat(mockRequest as NextApiRequest, mockResponse as NextApiResponse)

      // Verify error response was sent
      expect(mockResponse.status).toHaveBeenCalledWith(500)
    })

    it('should parse request body correctly', async () => {
      // Mock successful response
      const mockStream = {
        pipe: jest.fn()
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream
      } as Response)

      // Update mock request with complex query
      const complexQuery = 'Hello! How are you? Can you help me with coding?'
      mockRequest.body.query = complexQuery

      // Call the service
      await handleDifyChat(mockRequest as NextApiRequest, mockResponse as NextApiResponse)

      // Verify the message was parsed correctly in the API call
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            inputs: {},
            query: complexQuery,
            response_mode: 'streaming',
            conversation_id: '',
            user: 'test-user'
          })
        })
      )
    })

    it('should use correct headers for Dify API', async () => {
      // Mock successful response
      const mockStream = {
        pipe: jest.fn()
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream
      } as Response)

      // Call the service
      await handleDifyChat(mockRequest as NextApiRequest, mockResponse as NextApiResponse)

      // Verify headers
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          })
        })
      )
    })
  })
})