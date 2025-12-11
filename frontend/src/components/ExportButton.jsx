import { useContext, useEffect, useRef, useState } from 'react';
import {
  copyTranscriptToClipboard,
  exportPdf,
  exportTextFile,
  ensureExportable,
} from '../utils/exportUtils.js';
import { ChatContext } from '../context/ChatContext.jsx';

const MENU_ITEMS = [
  {
    key: 'pdf',
    label: 'Export as PDF',
    ariaLabel: 'Export conversation as PDF',
  },
  {
    key: 'text',
    label: 'Export as Text',
    ariaLabel: 'Export conversation as text file',
  },
  {
    key: 'copy',
    label: 'Copy conversation',
    ariaLabel: 'Copy conversation to clipboard',
  },
];

function ExportButton() {
  const { messages } = useContext(ChatContext);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const triggerRef = useRef(null);
  const menuRefs = useRef([]);
  const dropdownRef = useRef(null);

  const handleAction = async (action) => {
    setError(null);
    try {
      setIsBusy(true);
      switch (action) {
        case 'pdf':
          exportPdf(messages);
          setStatus('PDF downloaded.');
          break;
        case 'text':
          exportTextFile(messages);
          setStatus('Text file downloaded.');
          break;
        case 'copy':
          await copyTranscriptToClipboard(messages);
          setStatus('Copied to clipboard.');
          break;
        default:
          break;
      }
    } catch (err) {
      if (err?.code === 'SIZE_LIMIT') {
        setError('Conversation too large. Please export a smaller range.');
      } else {
        setError('Unable to export conversation. Please try again.');
      }
    } finally {
      setIsBusy(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const closeMenu = (focusTrigger = true) => {
    setIsMenuOpen(false);
    setHighlightedIndex(0);
    if (focusTrigger) {
      triggerRef.current?.focus();
    }
  };

  const openMenu = () => {
    if (isBusy || tooBig) return;
    setHighlightedIndex(0);
    setIsMenuOpen(true);
  };

  const toggleMenu = () => {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const handleMenuSelect = (action) => {
    closeMenu();
    handleAction(action);
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openMenu();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    }
  };

  const handleMenuKeyDown = (event, index) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (index + 1) % MENU_ITEMS.length;
      setHighlightedIndex(next);
      menuRefs.current[next]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = (index - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
      setHighlightedIndex(prev);
      menuRefs.current[prev]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      setHighlightedIndex(0);
      menuRefs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = MENU_ITEMS.length - 1;
      setHighlightedIndex(last);
      menuRefs.current[last]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    } else if (event.key === 'Tab') {
      closeMenu(false);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleMenuSelect(MENU_ITEMS[index].key);
    }
  };

  let tooBig = false;
  try {
    ensureExportable(messages);
  } catch (err) {
    if (err?.code === 'SIZE_LIMIT') {
      tooBig = true;
    }
  }

  useEffect(() => {
    if (isMenuOpen) {
      menuRefs.current[0]?.focus();
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target)) {
        closeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <div className="export-dropdown" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        className="export-dropdown__trigger"
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-controls="chat-export-menu"
        onClick={toggleMenu}
        onKeyDown={handleTriggerKeyDown}
        disabled={isBusy || tooBig}
      >
        Export ▾
      </button>
      {isMenuOpen && (
        <div
          className="export-dropdown__menu"
          role="menu"
          id="chat-export-menu"
          aria-label="Conversation export actions"
        >
          {MENU_ITEMS.map((item, index) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              ref={(element) => {
                menuRefs.current[index] = element;
              }}
              className="export-dropdown__item"
              onClick={() => handleMenuSelect(item.key)}
              onKeyDown={(event) => handleMenuKeyDown(event, index)}
              aria-label={item.ariaLabel}
              tabIndex={index === highlightedIndex ? 0 : -1}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {tooBig && <span className="export-warning">Conversation exceeds browser export limit.</span>}
      {status && <span className="export-status">{status}</span>}
      {error && <span className="export-error">{error}</span>}
    </div>
  );
}

export default ExportButton;
