import sys
from gtts import gTTS
import os
import base64

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
    
    encoded_text = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        decoded_text = base64.b64decode(encoded_text).decode('utf-8')
        text_to_speech(decoded_text, output_path)
    except Exception as e:
        print(f"Error decoding base64 string: {e}", file=sys.stderr)
        sys.exit(1)