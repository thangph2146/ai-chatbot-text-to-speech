import sys
from gtts import gTTS
import os

def text_to_speech(text, file_path):
    try:
        tts = gTTS(text=text, lang='vi', slow=False)
        tts.save(file_path)
        print(f"Successfully created audio file at {file_path}")
    except Exception as e:
        print(f"Error generating audio: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python tts.py \"<text>\" <output_file_path>", file=sys.stderr)
        sys.exit(1)
    
    text_to_process = sys.argv[1]
    output_path = sys.argv[2]
    
    text_to_speech(text_to_process, output_path)