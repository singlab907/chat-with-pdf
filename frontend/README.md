## Export & Share Setup

1. Install the PDF dependency once:

```bash
cd frontend
npm install jspdf
```

2. Start backend and frontend as usual.
3. Upload a document, generate a chat, then use the toolbar buttons:
   - **Export PDF** to download `chat-export-*.pdf`
   - **Export Text** to save a `.txt`
   - **Copy** to copy the same transcript to your clipboard
4. Large conversations (>300k characters) show a warning; trim or share a smaller range.
