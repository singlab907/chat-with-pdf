import { useEffect, useMemo, useRef } from 'react';
import { convertBBoxToViewportRect } from '../utils/citationUtils.js';

// Renders a single PDF page and exposes overlay anchors for citations
function PdfPage({
  page,
  viewport,
  pageNumber,
  citations = [],
  onRegisterAnchor,
  onRegisterPage,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderTask = page.render({
      canvasContext: context,
      viewport,
    });

    return () => {
      renderTask.cancel();
    };
  }, [page, viewport]);

  useEffect(() => {
    if (onRegisterPage && containerRef.current) {
      onRegisterPage(pageNumber - 1, containerRef.current);
    }
    return () => {
      if (onRegisterPage) {
        onRegisterPage(pageNumber - 1, null);
      }
    };
  }, [onRegisterPage, pageNumber]);

  const overlayAnchors = useMemo(
    () =>
      citations
        .map((citation) => {
          const rect = convertBBoxToViewportRect(citation.bbox, viewport);
          if (!rect) return null;
          return { citation, rect };
        })
        .filter(Boolean),
    [citations, viewport]
  );

  return (
    <div className="pdf-page" ref={containerRef}>
      <canvas ref={canvasRef} />
      <div className="pdf-page__overlay" aria-hidden="true">
        {overlayAnchors.map(({ citation, rect }) => (
          <span
            key={citation.id}
            className="pdf-page__anchor"
            data-citation-id={citation.id}
            style={{
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
            }}
            tabIndex={-1}
            ref={(node) => onRegisterAnchor?.(citation.id, node)}
          />
        ))}
      </div>
      <span className="pdf-page__label">Page {pageNumber}</span>
    </div>
  );
}

export default PdfPage;
