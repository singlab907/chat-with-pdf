const STORAGE_KEY = 'chatHistory';
const LEGACY_KEYS = ['chat-with-pdf:messages'];

// Persists chat messages to browser storage
export function saveMessages(messages) {
  try {
    const serialized = JSON.stringify(messages);
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save chat messages', error);
  }
}

// Loads previously saved chat messages
export function loadMessages() {
  try {
    let serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      for (const legacyKey of LEGACY_KEYS) {
        serialized = window.localStorage.getItem(legacyKey);
        if (serialized) {
          window.localStorage.setItem(STORAGE_KEY, serialized);
          break;
        }
      }
    }
    return serialized ? JSON.parse(serialized) : [];
  } catch (error) {
    console.error('Failed to load chat messages', error);
    return [];
  }
}

// Utility to clear chat history when needed
export function clearMessages() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    LEGACY_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch (error) {
    console.error('Failed to clear chat messages', error);
  }
}
