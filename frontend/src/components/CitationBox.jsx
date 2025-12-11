import { useState } from 'react';

// Displays a single citation number with a collapsible preview of the raw reference
function CitationBox({ citationNumber, rawText, onClick }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handlePillClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div className={`citation-box ${isOpen ? 'open' : ''}`}>
      <button type="button" className="citation-pill" onClick={handlePillClick}>
        [{citationNumber}]
      </button>
      <button
        type="button"
        className="citation-toggle"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        {isOpen ? 'Hide' : 'Show'} source
      </button>
      {isOpen && (
        <div className="citation-content">
          {rawText || 'Citation details unavailable.'}
        </div>
      )}
    </div>
  );
}

export default CitationBox;
