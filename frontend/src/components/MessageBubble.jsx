import { useMemo } from 'react';
import CitationBox from './CitationBox.jsx';
import { extractInlineCitations } from '../utils/citationUtils.js';

// Displays a chat bubble and renders inline citation controls where available
function MessageBubble({
  messageText,
  citations = [],
  sender = 'ai',
  timestamp,
  onCitationClick,
}) {
  const bubbleClass = sender === 'user' ? 'message-bubble user' : 'message-bubble ai';
  const displayCitations = useMemo(() => {
    if (Array.isArray(citations) && citations.length > 0) return citations;
    return extractInlineCitations(messageText);
  }, [citations, messageText]);

  const handleCitationClick = (citation, index) => {
    const citationId = citation?.id || citation?.anchorId;
    if (!citationId) return;
    if (typeof onCitationClick === 'function') {
      onCitationClick(citationId, {
        index,
        citation,
      });
    }
  };

  const formattedTime = useMemo(() => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '';
    }
  }, [timestamp]);

  return (
    <div className={bubbleClass}>
      <div>{messageText}</div>
      {formattedTime && <span className="message-bubble__timestamp">{formattedTime}</span>}
      {Array.isArray(displayCitations) && displayCitations.length > 0 && (
        <div className="citation-box-grid">
          {displayCitations.map((citation, index) => (
            <CitationBox
              key={citation?.id || index}
              citationNumber={index + 1}
              rawText={citation?.rawText || citation?.text || citation}
              onClick={() => handleCitationClick(citation, index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default MessageBubble;
