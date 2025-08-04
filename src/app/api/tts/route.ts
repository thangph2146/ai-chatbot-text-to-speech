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

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required and must be a string' }, { status: 400 });
    }

    // Validate text length
    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text too long (max 5000 characters)' }, { status: 400 });
    }

    // Clean and validate text
    const cleanText = text.trim();
    if (!cleanText) {
      return NextResponse.json({ error: 'Text cannot be empty' }, { status: 400 });
    }

    const tempFilePath = path.join(os.tmpdir(), `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`);
    const scriptPath = path.resolve(process.cwd(), 'scripts/tts.py');

    // Check if Python script exists
    try {
      await fs.access(scriptPath);
    } catch (_error) {
      console.error('Error checking script path:', _error);
      return NextResponse.json(
        { error: 'Python script not found' },
        { status: 500 }
      );
    }

    // It's important to wrap text in quotes to handle spaces and special characters
    const encodedText = Buffer.from(cleanText).toString('base64');
    const command = `python "${scriptPath}" "${encodedText}" "${tempFilePath}"`;

    console.log('Executing TTS command:', command);

    const { stderr, stdout } = await execPromise(command);

    if (stderr) {
      console.error(`TTS script stderr: ${stderr}`);
    }

    if (stdout) {
      console.log(`TTS script stdout: ${stdout}`);
    }

    // Check if audio file was created
    try {
      await fs.access(tempFilePath);
    } catch (_error) {
      console.error('Error checking temp file:', _error);
      return NextResponse.json(
        { error: 'Failed to create audio file' },
        { status: 500 }
      );
    }

    // Get file stats to validate
    const stats = await fs.stat(tempFilePath);
    if (stats.size === 0) {
      await fs.unlink(tempFilePath);
      return NextResponse.json({ error: 'Generated audio file is empty' }, { status: 500 });
    }

    // Read audio file
    const audioBuffer = await fs.readFile(tempFilePath);

    // Clean up temp file
    try {
      await fs.unlink(tempFilePath);
    } catch {
      // Ignore cleanup errors
    }

    // Validate audio buffer
    if (!audioBuffer || audioBuffer.length === 0) {
      return NextResponse.json({ error: 'Generated audio is empty' }, { status: 500 });
    }

    // Check if it's a valid MP3 file (basic check)
    const isMP3 = audioBuffer.length >= 3 && 
                  audioBuffer[0] === 0x49 && 
                  audioBuffer[1] === 0x44 && 
                  audioBuffer[2] === 0x33;

    if (!isMP3) {
      console.warn('Generated audio may not be valid MP3 format');
    }

    console.log(`TTS success: ${cleanText.length} chars -> ${audioBuffer.length} bytes`);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Error in TTS route:', error);
    
    // Clean up temp file if it exists
    try {
      const tempFilePath = path.join(os.tmpdir(), `tts_${Date.now()}.mp3`);
      await fs.unlink(tempFilePath);
    } catch {
      // Ignore cleanup errors
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: errorMessage 
    }, { status: 500 });
  }
}