import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PdfPage from './PdfPage.jsx';
import { CitationScroll } from '../utils/citationScroll.js';
import { ensureSnippetAnchor, keyFromCitation } from '../utils/citationUtils.js';

// Renders rich previews for PDF, Word, or plain text documents
function FilePreview({ file, citations = [], highlightCitation }) {
  const [wordHtml, setWordHtml] = useState('');
  const [pdfPages, setPdfPages] = useState([]);
  const [errorText, setErrorText] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [visiblePage, setVisiblePage] = useState(1);

  const citationRefs = useRef(new Map());
  const pdfPageRefs = useRef(new Map());
  const wordContainerRef = useRef(null);
  const textContainerRef = useRef(null);
  const viewerBodyRef = useRef(null);

  const previewUrl = file?.previewUrl;
  const parsedText = file?.parsedText;

  const isPdf = file?.type?.includes('pdf');
  const isWord = file?.type?.includes('word');
  const isText = file?.type?.includes('text');

  const normalizedCitations = useMemo(
    () =>
      citations.map((citation, index) => ({
        ...citation,
        id: keyFromCitation(citation, `citation-${index}`),
      })),
    [citations]
  );

  const textParagraphs = useMemo(() => {
    if (!isText || !parsedText) return [];
    return parsedText
      .split(/\n{2,}|\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [parsedText, isText]);

  const resetState = useCallback(() => {
    setWordHtml('');
    setPdfPages([]);
    setErrorText('');
    citationRefs.current.clear();
    pdfPageRefs.current.clear();
  }, []);

  useEffect(() => {
    resetState();
  }, [file, resetState]);

  // Render Word documents to HTML
  useEffect(() => {
    let isMounted = true;

    const renderWordDocument = async () => {
      if (!isWord || !previewUrl) {
        setWordHtml('');
        return;
      }

      try {
        const mammothModule = await import('mammoth/mammoth.browser.js');
        const arrayBuffer = await fetch(previewUrl).then((res) => res.arrayBuffer());
        const result = await mammothModule.convertToHtml({ arrayBuffer });
        if (isMounted) {
          setWordHtml(result.value);
        }
      } catch (error) {
        console.error('Failed to render Word document', error);
        if (isMounted) {
          setWordHtml('<p>Unable to display document.</p>');
          setErrorText('Word preview failed to load.');
        }
      }
    };

    renderWordDocument();
    return () => {
      isMounted = false;
    };
  }, [previewUrl, isWord]);

  // Render PDF documents using pdfjs-dist
  useEffect(() => {
    let isMounted = true;

    const renderPdfDocument = async () => {
      if (!isPdf || !previewUrl) {
        setPdfPages([]);
        return;
      }

      try {
        const pdfjsLib = await import('pdfjs-dist/build/pdf');
        const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.mjs?url');

        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

        const pdfTask = pdfjsLib.getDocument(previewUrl);
        const pdfDoc = await pdfTask.promise;
        const pages = [];

        for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
          const page = await pdfDoc.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.15 });
          pages.push({ page, viewport, pageNumber });
        }

        if (isMounted) {
          setPdfPages(pages);
        }
      } catch (error) {
        console.error('Failed to render PDF document', error);
        if (isMounted) {
          setPdfPages([]);
          setErrorText('PDF preview failed to load.');
        }
      }
    };

    renderPdfDocument();
    return () => {
      isMounted = false;
    };
  }, [previewUrl, isPdf]);

  // Attempt to create snippet anchors for Word content
  useEffect(() => {
    if (!isWord || !wordContainerRef.current) return;
    normalizedCitations.forEach((citation) => {
      if (citationRefs.current.has(citation.id)) return;
      if (!citation.textSnippet) return;
      const node = ensureSnippetAnchor(wordContainerRef.current, citation.id, citation.textSnippet);
      if (node) {
        citationRefs.current.set(citation.id, node);
      }
    });
  }, [wordHtml, normalizedCitations, isWord]);

  // Attempt to create snippet anchors for plain text preview
  useEffect(() => {
    if (!isText || !textContainerRef.current) return;
    normalizedCitations.forEach((citation) => {
      if (citationRefs.current.has(citation.id)) return;
      if (!citation.textSnippet) return;
      const node = ensureSnippetAnchor(textContainerRef.current, citation.id, citation.textSnippet);
      if (node) {
        citationRefs.current.set(citation.id, node);
      }
    });
  }, [textParagraphs, normalizedCitations, isText]);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    if (message) {
      setTimeout(() => setToastMessage(''), 2000);
    }
  }, []);

  const registerCitationAnchor = useCallback((id, node) => {
    if (!id) return;
    if (node) {
      citationRefs.current.set(id, node);
    } else {
      citationRefs.current.delete(id);
    }
  }, []);

  const registerPdfPage = useCallback((pageIndex, node) => {
    if (typeof pageIndex !== 'number') return;
    if (node) {
      pdfPageRefs.current.set(pageIndex, node);
    } else {
      pdfPageRefs.current.delete(pageIndex);
    }
  }, []);

  const scrollToCitation = useCallback(
    (citationId) => {
      if (!citationId) return false;
      const existingAnchor = citationRefs.current.get(citationId);
      if (existingAnchor) {
        CitationScroll.scrollTo(existingAnchor, { className: 'citation-highlight' });
        return true;
      }

      const citationMeta = normalizedCitations.find((entry) => entry.id === citationId);
      if (!citationMeta) {
        showToast('Citation metadata missing.');
        return false;
      }

      const resolvedPageIndex =
        typeof citationMeta.pageIndex === 'number'
          ? citationMeta.pageIndex
          : typeof citationMeta.page === 'number'
            ? Math.max(0, citationMeta.page - 1)
            : undefined;

      if (typeof resolvedPageIndex === 'number') {
        const pageNode = pdfPageRefs.current.get(resolvedPageIndex);
        if (pageNode) {
          CitationScroll.scrollTo(pageNode, { className: 'citation-highlight' });
          return true;
        }
      }

      if (citationMeta.textSnippet) {
        const snippetContainer =
          wordContainerRef.current || textContainerRef.current || null;
        if (snippetContainer) {
          const node = ensureSnippetAnchor(
            snippetContainer,
            citationMeta.id,
            citationMeta.textSnippet
          );
          if (node) {
            citationRefs.current.set(citationMeta.id, node);
            CitationScroll.scrollTo(node, { className: 'citation-highlight' });
            return true;
          }
        }
      }

      showToast('Referenced text not found in preview.');
      return false;
    },
    [normalizedCitations, showToast]
  );

  useEffect(() => {
    if (!highlightCitation?.id) return;
    scrollToCitation(highlightCitation.id);
  }, [highlightCitation, scrollToCitation]);

  const pdfContent = isPdf ? (
    <div className="file-preview__pdf">
      {pdfPages.map(({ page, viewport, pageNumber }) => {
        const pageIndex = pageNumber - 1;
        const pageCitations = normalizedCitations.filter(
          (citation) =>
            typeof citation.pageIndex === 'number'
              ? citation.pageIndex === pageIndex
              : citation.page === pageNumber
        );
        const bboxCitations = pageCitations.filter((citation) => !!citation.bbox);
        return (
          <div key={`pdf-wrapper-${pageNumber}`} data-page-number={pageNumber}>
            <PdfPage
              page={page}
              viewport={viewport}
              pageNumber={pageNumber}
              citations={bboxCitations}
              onRegisterAnchor={registerCitationAnchor}
              onRegisterPage={registerPdfPage}
            />
          </div>
        );
      })}
    </div>
  ) : null;

  const wordContent = isWord ? (
    <div
      ref={wordContainerRef}
      className="file-preview__word"
      dangerouslySetInnerHTML={{ __html: wordHtml }}
    />
  ) : null;

  const textContent = isText ? (
    <div className="file-preview__text" ref={textContainerRef}>
      {textParagraphs.map((paragraph, index) => (
        <p key={`text-${index}`}>{paragraph}</p>
      ))}
    </div>
  ) : null;

  const pageCount = isPdf ? pdfPages.length : null;

  useEffect(() => {
    const container = viewerBodyRef.current;
    if (!container || !isPdf || pdfPages.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visibleEntries.length > 0) {
          const pageId = visibleEntries[0].target.getAttribute('data-page-number');
          if (pageId) {
            setVisiblePage(Number(pageId));
          }
        }
      },
      {
        root: container,
        threshold: [0.3, 0.6, 0.9],
      }
    );

    const wrappers = container.querySelectorAll('[data-page-number]');
    wrappers.forEach((wrapper) => observer.observe(wrapper));

    return () => observer.disconnect();
  }, [isPdf, pdfPages]);

  if (!file) {
    return (
      <section className="file-preview">
        <div className="file-preview__body file-preview__body--empty">
          <p>Upload a document to view it alongside your chat.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="file-preview">
      <header className="file-preview__titlebar">
        <div>
          <p className="file-preview__title">{file.name}</p>
          <p className="file-preview__meta">
            {file.type || 'Document'}
            {pageCount ? ` | Page ${visiblePage} of ${pageCount}` : ''}
          </p>
        </div>
      </header>

      <div className="file-preview__body file-preview__body--loaded" ref={viewerBodyRef}>
        {pdfContent}
        {wordContent}
        {textContent}
        {!pdfContent && !wordContent && !textContent && (
          <div className="file-preview__unsupported">
            <p>Preview not available for this file type.</p>
          </div>
        )}
      </div>

      {errorText && <div className="file-preview__error">{errorText}</div>}
      {toastMessage && <div className="file-preview__toast">{toastMessage}</div>}
    </section>
  );
}

export default FilePreview;
