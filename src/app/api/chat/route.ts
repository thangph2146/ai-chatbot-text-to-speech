import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const MODEL_NAME = 'gemini-2.5-flash';

export async function POST(req: Request) {
  const { history, message } = await req.json();
  const apiKey = process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    return new Response('API key not found.', { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history: history,
  });

  try {
    const result = await chat.sendMessage(message);
    const response = result.response;
    return new Response(JSON.stringify({ text: response.text() }), { status: 200 });
  } catch (error) {
    console.error('Error sending message:', error);
    return new Response('Error processing your request.', { status: 500 });
  }
}