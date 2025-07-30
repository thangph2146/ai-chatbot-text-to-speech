// Next.js API route for Text-to-Speech using a Python script

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const tempFilePath = path.join(os.tmpdir(), `tts_${Date.now()}.mp3`);
    const scriptPath = path.resolve(process.cwd(), 'scripts/tts.py');

    // It's important to wrap text in quotes to handle spaces and special characters
    const encodedText = Buffer.from(text).toString('base64');
    const command = `python "${scriptPath}" "${encodedText}" "${tempFilePath}"`;

    const { stderr } = await execPromise(command);

    if (stderr) {
        console.error(`TTS script error: ${stderr}`);
        return NextResponse.json({ error: 'Failed to generate audio', details: stderr }, { status: 500 });
    }

    const audioBuffer = await fs.readFile(tempFilePath);

    await fs.unlink(tempFilePath);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error) {
    console.error('Error in TTS route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}