import { useCallback, useEffect, useState } from 'react';

// Draggable vertical splitter that resizes the chat/preview columns
function Splitter({ containerRef, onResize, minLeft = 320, minRight = 360, currentWidth }) {
  const [isDragging, setIsDragging] = useState(false);

  const clampWidth = useCallback(
    (nextWidth) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return nextWidth;
      const maxLeft = rect.width - minRight;
      const clamped = Math.min(Math.max(nextWidth, minLeft), maxLeft);
      return clamped;
    },
    [containerRef, minLeft, minRight]
  );

  const handlePointerMove = useCallback(
    (clientX) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const rawWidth = clientX - rect.left;
      const clamped = clampWidth(rawWidth);
      onResize(clamped);
    },
    [clampWidth, containerRef, onResize]
  );

  useEffect(() => {
    if (!isDragging) return undefined;

    const handleMouseMove = (event) => {
      event.preventDefault();
      handlePointerMove(event.clientX);
    };

    const handleTouchMove = (event) => {
      if (!event.touches[0]) return;
      handlePointerMove(event.touches[0].clientX);
      event.preventDefault();
    };

    const stopDragging = () => setIsDragging(false);

    const touchOptions = { passive: false };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, touchOptions);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('touchend', stopDragging);
    window.addEventListener('touchcancel', stopDragging);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove, touchOptions);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchend', stopDragging);
      window.removeEventListener('touchcancel', stopDragging);
    };
  }, [isDragging, handlePointerMove]);

  const startDragging = useCallback(
    (clientX) => {
      handlePointerMove(clientX);
      setIsDragging(true);
    },
    [handlePointerMove]
  );

  const handleMouseDown = (event) => {
    event.preventDefault();
    startDragging(event.clientX);
  };

  const handleTouchStart = (event) => {
    if (!event.touches[0]) return;
    event.preventDefault();
    startDragging(event.touches[0].clientX);
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const delta = event.key === 'ArrowLeft' ? -24 : 24;
    const clamped = clampWidth((currentWidth || minLeft) + delta);
    onResize(clamped);
  };

  return (
    <div
      className={`splitter${isDragging ? ' dragging' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize chat and preview panels"
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
    >
      <span className="splitter-handle" aria-hidden="true" />
    </div>
  );
}

export default Splitter;
