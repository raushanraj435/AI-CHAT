import os
from flask import Flask, render_template, request, jsonify
from google import genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY is missing. Create a .env file and add your Gemini API key.")

client = genai.Client(api_key=api_key)

# Fallback models: if one is temporarily unavailable, try the next one.
MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
]


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    history = data.get("history") or []

    if not message:
        return jsonify({"error": "Message cannot be empty."}), 400

    # Build a simple conversation prompt from the browser's conversation history.
    # The API key remains safely on the server.
    conversation = []
    for item in history[-20:]:
        role = item.get("role")
        content = (item.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            speaker = "User" if role == "user" else "Assistant"
            conversation.append(f"{speaker}: {content}")

    conversation.append(f"User: {message}")
    conversation.append("Assistant:")

    prompt = "\n\n".join(conversation)

    last_error = None

    for model in MODELS:
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt
            )

            text = (response.text or "").strip()

            if not text:
                raise RuntimeError("Gemini returned an empty response.")

            return jsonify({
                "reply": text,
                "model": model
            })

        except Exception as exc:
            last_error = str(exc)
            continue

    return jsonify({
        "error": "All Gemini models are currently unavailable. Please try again.",
        "details": last_error
    }), 503


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
