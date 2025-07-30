import logger from "@/app/lib/logger";
import handleDifyChat from "@/service/dify/dify-service";
import { NextApiRequest, NextApiResponse } from "next";

// Helper function to adapt Next.js App Router Request to Pages Router NextApiRequest
async function adaptRequest(req: Request): Promise<NextApiRequest> {
  const body = await req.json().catch(() => ({}));
  const headers: { [key: string]: string } = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    method: req.method,
    body,
    headers,
    query: {},
    cookies: {},
  } as unknown as NextApiRequest;
}

export async function POST(req: Request) {
  logger.info('Received POST request to /api/chat');
  const nextReq = await adaptRequest(req);

  // Create a mock response object that we can control
  const chunks: Buffer[] = [];
  let headers: Record<string, string | string[]> = {};
  let statusCode = 200;

  const res: NextApiResponse = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: unknown) => {
      chunks.push(Buffer.from(JSON.stringify(data)));
      headers = { ...headers, "Content-Type": "application/json" };
    },
    send: (data: unknown) => {
      chunks.push(Buffer.from(String(data)));
    },
    setHeader: (name: string, value: string | string[]) => {
      headers = { ...headers, [name]: value };
    },
    getHeader: (name: string) => {
      return headers[name as keyof typeof headers];
    },
    end: () => {
      // This is where we would signal completion if not streaming
    },
    pipe: () => {
      // For streaming responses, we will handle this differently
      // The stream will be returned directly in the Response
    },
  } as unknown as NextApiResponse;

  // Create a new streamable response
  const responseStream = new TransformStream();

  // Override pipe to write to our transform stream
  res.pipe = <T extends NodeJS.WritableStream>(destination: T) => {
    // For streaming responses, we handle this differently
    return destination;
  };

  // Call the original handler
  await handleDifyChat(nextReq, res);

  // Check if the response was a stream
  if (res.getHeader("Content-Type") === "text/event-stream") {
    return new Response(responseStream.readable, {
      status: statusCode,
      headers: new Headers(headers as Record<string, string>),
    });
  }

  // If not a stream, return a regular response
  const body = Buffer.concat(chunks);
  return new Response(body, { status: statusCode, headers: new Headers(headers as Record<string, string>) });
}
