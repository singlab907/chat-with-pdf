const NORMALIZED_THRESHOLD = 1.05;
let citationSequence = 0;

// Determines whether a bbox is proportionally encoded (0..1 range)
function isNormalizedBBox(bbox) {
  if (!bbox) return false;
  const values = [bbox.x, bbox.y, bbox.width, bbox.height];
  return values.every(
    (value) => typeof value === 'number' && value >= 0 && value <= NORMALIZED_THRESHOLD
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampRect(rect, viewport) {
  if (!rect || !viewport) return null;
  const width = viewport.width;
  const height = viewport.height;

  const left = clamp(rect.left, 0, width);
  const top = clamp(rect.top, 0, height);
  const rectWidth = clamp(rect.width, 2, width);
  const rectHeight = clamp(rect.height, 2, height);

  return {
    left,
    top,
    width: rectWidth,
    height: rectHeight,
  };
}

// Converts PDF-space or normalized bbox into viewport coordinates
export function convertBBoxToViewportRect(bbox, viewport) {
  if (!bbox || !viewport) return null;

  if (isNormalizedBBox(bbox)) {
    const left = bbox.x * viewport.width;
    const top = bbox.y * viewport.height;
    return clampRect(
      {
        left,
        top,
        width: bbox.width * viewport.width,
        height: bbox.height * viewport.height,
      },
      viewport
    );
  }

  try {
    const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([
      bbox.x,
      bbox.y,
      bbox.x + bbox.width,
      bbox.y + bbox.height,
    ]);
    return clampRect(
      {
        left: Math.min(x1, x2),
        top: Math.min(y1, y2),
        width: Math.abs(x1 - x2),
        height: Math.abs(y1 - y2),
      },
      viewport
    );
  } catch (error) {
    console.warn('Unable to convert bbox to viewport rect', error);
    return null;
  }
}

// Searches the provided container for a snippet of text and wraps it with an anchor span
export function ensureSnippetAnchor(container, citationId, snippet) {
  if (!container || !snippet) return null;
  const existing = container.querySelector(`[data-citation-id="${citationId}"]`);
  if (existing) {
    return existing;
  }

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const normalizedSnippet = snippet.trim().toLowerCase();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node || !node.nodeValue) continue;
    const textLower = node.nodeValue.toLowerCase();
    const index = textLower.indexOf(normalizedSnippet);
    if (index !== -1) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + snippet.length);
      const span = document.createElement('span');
      span.dataset.citationId = citationId;
      span.className = 'citation-snippet-anchor';
      range.surroundContents(span);
      return span;
    }
  }
  return null;
}

export function keyFromCitation(citation, fallback = null) {
  if (!citation) return fallback;
  if (citation.id) return citation.id;
  if (citation.anchorId) return citation.anchorId;
  if (typeof citation.pageIndex === 'number') return `page-${citation.pageIndex}`;
  if (typeof citation.page === 'number') return `page-${Math.max(0, citation.page - 1)}`;
  if (citation.textSnippet) return `snippet-${citation.textSnippet.slice(0, 16)}`;
  if (citation.rawText) return `raw-${citation.rawText.slice(0, 16)}`;
  return fallback;
}

export function extractInlineCitations(text) {
  if (!text) return [];
  const matches = [];
  const regex = /\b(?:\[(?:p\.?|page)\s*(\d+)\]|(?:p\.?|page)\s*(\d+))\b/gi;

  let exec;
  while ((exec = regex.exec(text))) {
    const pageString = exec[1] || exec[2];
    const pageNumber = parseInt(pageString, 10);
    if (Number.isFinite(pageNumber)) {
      matches.push({
        id: `inline-${citationSequence++}-${exec.index}`,
        pageIndex: Math.max(0, pageNumber - 1),
        rawText: exec[0],
        textSnippet: exec[0],
      });
    }
  }
  return matches;
}
