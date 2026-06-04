# ============================================
# Local Whisper Transcription Script
# Usage: python scripts/transcribe.py <path_to_wav_file>
# ============================================
import sys
import os

def transcribe(audio_path):
    if not os.path.exists(audio_path):
        print(f"Error: Audio file not found at {audio_path}", file=sys.stderr)
        sys.exit(1)

    try:
        import whisper
    except ImportError:
        print("Error: 'openai-whisper' package is not installed. Run: pip install openai-whisper", file=sys.stderr)
        sys.exit(2)

    try:
        # Load the base model (tiny, base, or small are suitable for local laptops)
        # Using "base" for a good balance of speed and accuracy
        model = whisper.load_model("base")
        result = model.transcribe(audio_path)
        
        # Output the result text to stdout
        print(result.get("text", "").strip())
    except Exception as e:
        print(f"Error during transcription: {str(e)}", file=sys.stderr)
        sys.exit(3)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/transcribe.py <path_to_wav_file>", file=sys.stderr)
        sys.exit(1)

    transcribe(sys.argv[1])
