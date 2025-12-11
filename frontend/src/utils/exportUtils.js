import { jsPDF } from 'jspdf';

const MAX_EXPORT_CHARS = 300000;

function formatTimestamp(timestamp) {
  try {
    return new Date(timestamp).toISOString().replace('T', ' ').split('.')[0];
  } catch {
    return '';
  }
}

function formatCitationSummary(citation) {
  if (!citation) return '';
  const parts = [];
  if (citation.id) parts.push(`id: ${citation.id}`);
  if (typeof citation.pageIndex === 'number') {
    parts.push(`page ${citation.pageIndex + 1}`);
  }
  if (citation.textSnippet || citation.rawText) {
    parts.push(`"${citation.textSnippet || citation.rawText}"`);
  }
  return parts.join(' — ');
}

function gatherGlobalCitations(messages = []) {
  const map = new Map();
  messages.forEach((message) => {
    (message.citations || []).forEach((citation) => {
      const key = citation.id || citation.anchorId;
      if (!key || map.has(key)) return;
      map.set(key, citation);
    });
  });
  return Array.from(map.values());
}

export function formatTranscript(messages = []) {
  const lines = [];
  lines.push('Chat with PDF — Conversation Export');
  lines.push(`Generated: ${formatTimestamp(Date.now())}`);
  lines.push('');

  messages.forEach((message, index) => {
    const label = message.role === 'ai' ? 'AI' : message.role === 'system' ? 'System' : 'User';
    lines.push(`${index + 1}. ${label} — ${formatTimestamp(message.timestamp)}`);
    lines.push((message.text || message.content || '').trim());
    if (message.citations?.length) {
      lines.push('  Citations:');
      message.citations.forEach((citation, idx) => {
        lines.push(`    [${idx + 1}] ${formatCitationSummary(citation)}`);
      });
    }
    lines.push('');
  });

  const globalCitations = gatherGlobalCitations(messages);
  if (globalCitations.length) {
    lines.push('Citation Index:');
    globalCitations.forEach((citation) => {
      lines.push(` - ${formatCitationSummary(citation)}`);
    });
  }

  return lines.join('\n').trim();
}

export function ensureExportable(messages) {
  const transcript = formatTranscript(messages);
  if (transcript.length > MAX_EXPORT_CHARS) {
    const error = new Error(
      'Conversation is too large to export in the browser. Please shorten the range.'
    );
    error.code = 'SIZE_LIMIT';
    throw error;
  }
  return transcript;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportTextFile(messages) {
  const transcript = ensureExportable(messages);
  const filename = `chat-export-${Date.now()}.txt`;
  downloadBlob(transcript, filename, 'text/plain');
}

export async function copyTranscriptToClipboard(messages) {
  const transcript = ensureExportable(messages);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(transcript);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = transcript;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function exportPdf(messages) {
  const transcript = ensureExportable(messages);
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const maxWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const writeLines = (text, opts = {}) => {
    const { bold = false, spacer = 18 } = opts;
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.setFont(undefined, bold ? 'bold' : 'normal');
    lines.forEach((line) => {
      if (cursorY > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(line, margin, cursorY);
      cursorY += spacer;
    });
    doc.setFont(undefined, 'normal');
  };

  writeLines('Chat with PDF — Conversation Export', { bold: true });
  writeLines(`Generated: ${formatTimestamp(Date.now())}`);
  writeLines('');

  messages.forEach((message, index) => {
    const label = message.role === 'ai' ? 'AI' : message.role === 'system' ? 'System' : 'User';
    writeLines(`${index + 1}. ${label} — ${formatTimestamp(message.timestamp)}`, {
      bold: true,
      spacer: 16,
    });
    writeLines((message.text || message.content || '').trim(), { spacer: 14 });
    if (message.citations?.length) {
      writeLines('Citations:', { bold: true, spacer: 14 });
      message.citations.forEach((citation, idx) => {
        writeLines(` [${idx + 1}] ${formatCitationSummary(citation)}`, { spacer: 12 });
      });
    }
    writeLines('');
  });

  const globalCitations = gatherGlobalCitations(messages);
  if (globalCitations.length) {
    writeLines('Citation Index', { bold: true, spacer: 16 });
    globalCitations.forEach((citation) => {
      writeLines(formatCitationSummary(citation), { spacer: 12 });
    });
  }

  const filename = `chat-export-${Date.now()}.pdf`;
  doc.save(filename);
  return transcript.length;
}
