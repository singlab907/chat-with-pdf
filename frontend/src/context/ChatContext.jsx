import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { clearMessages, loadMessages, saveMessages } from '../utils/localStorage.js';
import { extractInlineCitations } from '../utils/citationUtils.js';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'https://chat-with-pdf-d1bw.onrender.com').replace(/\/$/, '');
const API_BASE_URL = `${API_ORIGIN}/api`;

// Centralized chat store responsible for persisting messages and talking to the backend
export const ChatContext = createContext({
  messages: [],
  uploadedFile: null,
  isSending: false,
  setUploadedFile: () => {},
  addMessage: () => {},
  sendMessage: async () => {},
  highlightCitation: null,
  setHighlightCitationId: () => {},
  clearChatHistory: () => {},
});

const generateMessageId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const normalizeMessage = (message = {}) => {
  const id = message.id || generateMessageId();
  const role = message.role || message.sender || 'user';
  const text = message.text || message.content || '';
  const timestamp = message.timestamp || message.createdAt || Date.now();

  let citations = Array.isArray(message.citations) ? message.citations : [];
  if (!citations.length && message.citation) {
    citations = [
      {
        id: `${id}-citation`,
        rawText: message.citation,
      },
    ];
  }
  if (!citations.length && text) {
    citations = extractInlineCitations(text);
  }

  return {
    ...message,
    id,
    role,
    sender: message.sender || role,
    text,
    content: message.content || text,
    citations,
    timestamp,
  };
};

const normalizeStoredMessages = (storedMessages) =>
  (Array.isArray(storedMessages) ? storedMessages : []).map((message) =>
    normalizeMessage(message)
  );

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState(() => normalizeStoredMessages(loadMessages()));
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [highlightCitation, setHighlightCitation] = useState(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    saveMessages(messages);
  }, [messages]);

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, normalizeMessage(message)]);
  }, []);

  const clearChatHistory = useCallback(() => {
    setMessages([]);
    setHighlightCitation(null);
    clearMessages();
  }, []);

  const sendMessage = useCallback(
    async (prompt) => {
      const trimmed = prompt?.trim();
      if (!trimmed) {
        throw new Error('Prompt cannot be empty.');
      }

      if (!uploadedFile?.parsedText) {
        throw new Error('Please upload and parse a document before chatting.');
      }

      const userMessage = normalizeMessage({
        id: generateMessageId(),
        text: trimmed,
        content: trimmed,
        sender: 'user',
        role: 'user',
        timestamp: Date.now(),
        citations: [],
      });
      const pendingHistory = [...messagesRef.current, userMessage];
      setMessages(pendingHistory);
      messagesRef.current = pendingHistory;

      try {
        setIsSending(true);
        const response = await axios.post(`${API_BASE_URL}/chat`, {
          fileName: uploadedFile.name,
          fileContent: uploadedFile.parsedText,
          prompt: trimmed,
          conversationHistory: pendingHistory,
        });

        const { responseText, citations } = response.data;
        const normalizedCitations = Array.isArray(citations)
          ? citations.map((citation, index) => {
              const isStringCitation = typeof citation === 'string';
              const base = isStringCitation ? {} : citation || {};
              const rawText = isStringCitation
                ? citation
                : base.rawText || base.text || base.textSnippet || '';
              const pageIndex =
                typeof base.pageIndex === 'number'
                  ? base.pageIndex
                  : typeof base.page === 'number'
                    ? Math.max(0, base.page - 1)
                    : undefined;
              const id = base.id || base.anchorId || `citation-${Date.now()}-${index}`;
              return {
                ...base,
                id,
                anchorId: base.anchorId || id,
                rawText,
                textSnippet: base.textSnippet || rawText,
                pageIndex,
              };
            })
          : [];
        const inlineCitations =
          normalizedCitations.length === 0 ? extractInlineCitations(responseText) : [];
        const finalCitations =
          normalizedCitations.length > 0 ? normalizedCitations : inlineCitations;
        const aiMessage = normalizeMessage({
          id: generateMessageId(),
          text: responseText,
          content: responseText,
          sender: 'ai',
          role: 'ai',
          timestamp: Date.now(),
          citations: finalCitations,
        });

        const nextHistory = [...pendingHistory, aiMessage];
        setMessages(nextHistory);
        messagesRef.current = nextHistory;
      } catch (error) {
        console.error('Failed to fetch AI response', error);
        const errorMessage = normalizeMessage({
          id: generateMessageId(),
          text: 'Unable to complete your request. Please try again.',
          content: 'Unable to complete your request. Please try again.',
          sender: 'system',
          role: 'system',
          timestamp: Date.now(),
          citations: [],
        });
        const errorHistory = [...pendingHistory, errorMessage];
        setMessages(errorHistory);
        messagesRef.current = errorHistory;
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [uploadedFile]
  );

  const setHighlightCitationId = useCallback((id) => {
    if (!id) {
      setHighlightCitation(null);
      return;
    }
    setHighlightCitation({ id, timestamp: Date.now() });
  }, []);

  const value = {
    messages,
    uploadedFile,
    isSending,
    setUploadedFile,
    addMessage,
    sendMessage,
    highlightCitation,
    setHighlightCitationId,
    clearChatHistory,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
