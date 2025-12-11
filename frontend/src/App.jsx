import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import FileUpload from './components/FileUpload.jsx';
import ChatWindow from './components/ChatWindow.jsx';
import FilePreview from './components/FilePreview.jsx';
import ExportButton from './components/ExportButton.jsx';
import Splitter from './components/Splitter.jsx';
import { ChatContext, ChatProvider } from './context/ChatContext.jsx';
import { extractInlineCitations } from './utils/citationUtils.js';
import './App.css';

// Renders the overall application layout and handles chat input
function AppContent() {
  const {
    messages,
    uploadedFile,
    setUploadedFile,
    sendMessage,
    isSending,
    highlightCitation,
    setHighlightCitationId,
    clearChatHistory,
  } = useContext(ChatContext);

  const [inputValue, setInputValue] = useState('');
  const [errorText, setErrorText] = useState('');
  const gridRef = useRef(null);
  const [leftWidth, setLeftWidth] = useState(() => {
    const stored = Number(localStorage.getItem('chatPaneWidth'));
    if (Number.isFinite(stored) && stored > 260) {
      return stored;
    }
    return 420;
  });

  useEffect(() => {
    localStorage.setItem('chatPaneWidth', String(leftWidth));
  }, [leftWidth]);

  useEffect(() => {
    return () => {
      if (uploadedFile?.previewUrl) {
        URL.revokeObjectURL(uploadedFile.previewUrl);
      }
    };
  }, [uploadedFile]);

  const handleFileUpload = (fileData) => {
    setUploadedFile(fileData);
    setHighlightCitationId(null);
  };

  const handleClearChat = () => {
    clearChatHistory();
    setUploadedFile(null);
    setHighlightCitationId(null);
  };

  const handleNewConversation = () => {
    clearChatHistory();
    setHighlightCitationId(null);
  };

  const documentCitations = useMemo(() => {
    const map = new Map();
    messages.forEach((message) => {
      const citationList =
        Array.isArray(message.citations) && message.citations.length > 0
          ? message.citations
          : extractInlineCitations(message.text || message.content || '');
      citationList.forEach((citation) => {
        const key = citation?.id || citation?.anchorId;
        if (!key) return;
        if (!map.has(key)) {
          map.set(key, { ...citation, id: key });
        }
      });
    });
    return Array.from(map.values());
  }, [messages]);

  const handlePaneResize = useCallback((newWidth) => {
    setLeftWidth((prev) => {
      if (newWidth === prev) return prev;
      return newWidth;
    });
  }, []);

  const quickPromptText = 'Summarize this document in 3 bullet points';

  const handleSendMessage = async (textOverride) => {
    const sourceText = typeof textOverride === 'string' ? textOverride : inputValue;
    const trimmed = sourceText.trim();
    if (!trimmed) {
      setErrorText('Enter a prompt to continue.');
      return;
    }

    try {
      setErrorText('');
      await sendMessage(trimmed);
      setInputValue('');
    } catch (error) {
      setErrorText(error.message || 'Failed to send message.');
    }
  };

  return (
    <div className="app-shell">
      <div
        className="app-grid"
        ref={gridRef}
        style={{ gridTemplateColumns: `${leftWidth}px 10px minmax(0, 1fr)` }}
      >
        <section className="chat-column">
          <div className="chat-panel">
            <header className="chat-panel__hero">
              <div className="chat-panel__logo" aria-hidden="true">
                <svg viewBox="0 0 64 64" role="presentation">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    d="M20 40 28 24l8 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="43"
                    y1="24"
                    x2="43"
                    y2="40"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="chat-panel__heading">
                <p className="chat-panel__title">PDF READER</p>
                <p className="chat-panel__subtitle">Powered By @aiproductlabs</p>
              </div>
            </header>
            <div className="chat-toolbar">
              <div className="chat-toolbar__actions">
                <button type="button" className="control-button" onClick={handleClearChat}>
                  <span aria-hidden="true" className="control-button__icon">
                    <svg viewBox="0 0 24 24" role="presentation">
                      <path
                        d="M4 7h16M10 11v6m4-6v6M9 4h6l1 3H8z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  Clear Conversation
                </button>
                <ExportButton />
              </div>
              {uploadedFile && (
                <button
                  type="button"
                  className="control-button control-button--ghost"
                  onClick={handleNewConversation}
                >
                  Start a new conversation
                </button>
              )}
            </div>
            <ChatWindow
              messages={messages}
              quickPromptText={quickPromptText}
              onQuickPromptSend={() => handleSendMessage(quickPromptText)}
            />
            <div className="chat-input-bar">
              <input
                type="text"
                placeholder="Ask something about your document..."
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
              />
              <button type="button" onClick={handleSendMessage} disabled={isSending}>
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </div>
            {errorText && <div className="error-text">{errorText}</div>}
          </div>
        </section>
        <Splitter
          containerRef={gridRef}
          onResize={handlePaneResize}
          minLeft={320}
          minRight={360}
          currentWidth={leftWidth}
        />
        <section className="preview-column">
          {uploadedFile ? (
            <div className="viewer-panel">
              <FilePreview
                file={uploadedFile}
                citations={documentCitations}
                highlightCitation={highlightCitation}
              />
            </div>
          ) : (
            <div className="viewer-panel viewer-panel--upload">
              <FileUpload onFileUpload={handleFileUpload} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function App() {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
}

export default App;
