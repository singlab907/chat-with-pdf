import { useContext, useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble.jsx';
import { ChatContext } from '../context/ChatContext.jsx';

// Displays chat history and forwards citation clicks into shared context
function ChatWindow({ messages = [], quickPromptText, onQuickPromptSend }) {
  const listRef = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const { setHighlightCitationId } = useContext(ChatContext);

  useEffect(() => {
    if (isNearBottom && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isNearBottom]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    setIsNearBottom(distanceFromBottom < 80);
  };

  return (
    <div className="chat-window">
      <div ref={listRef} className="messages-list" onScroll={handleScroll}>
        {messages.length === 0 ? (
          <div className="chat-window__empty">
            <p>Chat messages appear here</p>
            <span>Start chatting once your document is ready.</span>
            {quickPromptText && typeof onQuickPromptSend === 'function' && (
              <button
                type="button"
                className="chat-quick-prompts__button"
                onClick={onQuickPromptSend}
              >
                {quickPromptText}
              </button>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              messageText={message.text}
              sender={message.sender}
              timestamp={message.timestamp}
              citations={message.citations}
              onCitationClick={(citationId) => setHighlightCitationId(citationId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default ChatWindow;
