// API endpoint để proxy request đến Dify API
import logger from '@/app/lib/logger';
import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import { Agent } from 'https';

const getDifyApiBaseUrl = () => process.env.DIFY_API_BASE_URL || 'https://api.dify.ai';
const getDifyApiKey = () => process.env.DIFY_API_KEY;

export default async function handleDifyChat(req: NextApiRequest, res: NextApiResponse) {
  try {
    const difyApiUrl = `${getDifyApiBaseUrl()}/v1/chat-messages`;
    const difyApiKey = getDifyApiKey();

    logger.info('Dify API URL:', difyApiUrl);
    logger.info('Dify API Key:', difyApiKey ? 'Loaded' : 'Not Loaded');

    if (!difyApiKey) {
      return res.status(500).json({ error: 'DIFY_API_KEY chưa được cấu hình' });
    }

    // Create HTTPS agent that ignores SSL certificate errors
    const httpsAgent = new Agent({
      rejectUnauthorized: false
    });

    // Chuyển tiếp request đến Dify API với API key từ server
    const response = await fetch(difyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${difyApiKey}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        ...req.body,
        response_mode: 'streaming' // Change to streaming mode for SSE response
      }),
      agent: httpsAgent,
      timeout: 30000 // 30 seconds timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Dify API error: ${response.status} - ${errorText}`);

      let userMessage = '';
      switch(response.status) {
        case 400:
          userMessage = 'Yêu cầu không hợp lệ. Vui lòng thử lại với nội dung khác.';
          break;
        case 401:
          userMessage = 'Phiên làm việc của bạn đã hết hạn. Vui lòng tải lại trang để tiếp tục trò chuyện.';
          break;
        case 403:
          userMessage = 'Bạn không có quyền truy cập chức năng này.';
          break;
        case 404:
          userMessage = 'Không thể kết nối đến trợ lý AI. Vui lòng thử lại sau.';
          break;
        case 429:
          userMessage = 'Xin lỗi! Tôi đang nhận quá nhiều yêu cầu. Hãy đợi một lát và thử lại nhé.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          userMessage = 'Hệ thống AI tạm thời không phản hồi. Tôi sẽ sớm hoạt động trở lại!';
          break;
        default:
          userMessage = 'Đã xảy ra lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.';
      }

      return res.status(response.status).json({
        error: `Lỗi API Dify: ${response.status}`,
        message: userMessage
      });
    }

    // Chuyển response từ Dify API về client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream response về client
    response.body.pipe(res);
   } catch (error: unknown) {
     logger.error('Lỗi khi gọi Dify API:', error);
     
     // Send a more specific error message based on the error type
     let userMessage = 'Vui lòng thử lại sau ít phút.';
     let statusCode = 500;
     
     if (typeof error === 'object' && error !== null && ('code' in error) && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
       statusCode = 503;
       userMessage = 'Kết nối mạng có vấn đề. Vui lòng kiểm tra kết nối internet và thử lại.';
     } else if (typeof error === 'object' && error !== null && ('code' in error) && error.code === 'ETIMEDOUT') {
       statusCode = 504;
       userMessage = 'Câu hỏi của bạn quá phức tạp, tôi cần thêm thời gian. Hãy thử câu ngắn gọn hơn hoặc chia nhỏ vấn đề.';
     } else if (typeof error === 'object' && error !== null && ('type' in error) && error.type === 'system' && ('code' in error) && error.code === 'ERR_INVALID_URL') {
       statusCode = 500;
       userMessage = 'Có lỗi xảy ra với hệ thống. Vui lòng thử lại sau hoặc liên hệ hỗ trợ nếu vấn đề vẫn tiếp diễn.';
     } else if (typeof error === 'object' && error !== null && ('name' in error) && error.name === 'AbortError') {
       statusCode = 408;
       userMessage = 'Câu hỏi của bạn quá phức tạp, tôi cần thêm thời gian. Hãy thử câu ngắn gọn hơn hoặc chia nhỏ vấn đề.';
     }
     
     return res.status(statusCode).json({
       error: `Lỗi khi gọi Dify API: ${error instanceof Error ? error.message : 'Unknown error'}`,
       message: userMessage
     });
   }
 }