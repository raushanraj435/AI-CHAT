# Gemini AI Chat Assistant

A full-stack Gemini chatbot built with Flask, HTML, CSS, JavaScript, and the Google GenAI SDK.

## Features

1. Chat history
2. Enter to send
3. Loading/typing animation
4. Dark/light mode
5. Responsive UI
6. Clear current chat
7. Markdown rendering
8. Code blocks with syntax highlighting
9. Copy code button
10. Error handling
11. Multiple conversations
12. Local browser storage for conversation history
13. API key kept on the backend

## Project Structure

```text
gemini_ai_chat_assistant/
├── app.py
├── .env
├── .env.example
├── .gitignore
├── requirements.txt
├── README.md
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── script.js
```

## 1. Install dependencies

Open PowerShell in this folder:

```powershell
pip install -r requirements.txt
```

## 2. Add your API key

Create a file named:

```text
.env
```

Put:

```env
GEMINI_API_KEY=YOUR_ACTUAL_GEMINI_API_KEY
```

Never commit `.env` to GitHub. `.gitignore` already ignores it.

## 3. Run

```powershell
python app.py
```

Open:

```text
http://127.0.0.1:5000
```

## Notes

- Chat history and multiple conversations are stored in the browser's localStorage.
- The API key is never sent to the frontend.
- Markdown is rendered using Marked.js.
- Code syntax highlighting uses Highlight.js.
- Marked.js and Highlight.js are loaded from jsDelivr CDN, so an internet connection is needed for those frontend enhancements.
- The backend tries fallback Gemini models if the first model is temporarily unavailable.

## GitHub

Upload:

```text
app.py
requirements.txt
README.md
.env.example
.gitignore
templates/
static/
```

Do NOT upload:

```text
.env
```
