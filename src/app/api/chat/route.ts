import logger from "@/app/lib/logger";
import handleDifyChat from "@/service/dify/dify-service";
import { NextApiRequest, NextApiResponse } from "next";
import { Readable } from "stream";

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
  const chunks: any[] = [];
  let headers = {};
  let statusCode = 200;

  const res: NextApiResponse = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      chunks.push(Buffer.from(JSON.stringify(data)));
      headers = { ...headers, "Content-Type": "application/json" };
    },
    send: (data: any) => {
      chunks.push(Buffer.from(data));
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
    // @ts-ignore
    pipe: (stream: Readable) => {
      // For streaming responses, we will handle this differently
      // The stream will be returned directly in the Response
    },
  } as unknown as NextApiResponse;

  // Create a new streamable response
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Override pipe to write to our transform stream
  res.pipe = (stream: Readable) => {
    stream.on("data", (chunk) => {
      writer.write(encoder.encode(chunk.toString()));
    });
    stream.on("end", () => {
      writer.close();
    });
    return stream;
  };

  // Call the original handler
  await handleDifyChat(nextReq, res);

  // Check if the response was a stream
  if (res.getHeader("Content-Type") === "text/event-stream") {
    return new Response(responseStream.readable, {
      status: statusCode,
      headers,
    });
  }

  // If not a stream, return a regular response
  const body = Buffer.concat(chunks);
  return new Response(body, { status: statusCode, headers });
}
