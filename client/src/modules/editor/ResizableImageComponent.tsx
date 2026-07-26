import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useRef, useState, useEffect } from 'react';

export const ResizableImageComponent: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [startWidth, setStartWidth] = useState(0);
  const [startX, setStartX] = useState(0);

  const src = node.attrs.src;
  const width = node.attrs.width;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const dx = e.clientX - startX;
      const newWidth = Math.max(100, startWidth + dx); // min width 100px
      updateAttributes({ width: `${newWidth}px` });
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startX, startWidth, updateAttributes]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (containerRef.current) {
      setStartWidth(containerRef.current.offsetWidth);
      setStartX(e.clientX);
      setIsResizing(true);
    }
  };

  return (
    <NodeViewWrapper 
      className={`resizable-image-wrapper ${selected ? 'ProseMirror-selectednode' : ''}`}
      style={{ 
        display: 'inline-block',
        width: typeof width === 'number' ? `${width}px` : width,
        position: 'relative'
      }}
    >
      <div 
        ref={containerRef}
        style={{
          position: 'relative',
          display: 'inline-block',
          width: '100%',
          maxWidth: '100%'
        }}
        data-drag-handle
      >
        <img 
          src={src} 
          alt={node.attrs.alt} 
          style={{ 
            width: '100%', 
            display: 'block', 
            borderRadius: '8px',
            border: selected ? '2px solid var(--orange)' : '2px solid transparent',
            transition: 'border-color 0.1s ease',
            cursor: 'grab' // Indicates it can be dragged
          }} 
        />
        
        {/* Resize Handle - only visible when selected to keep it clean */}
        {selected && (
          <div
            onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              right: '-6px',
              bottom: '-6px',
              width: '12px',
              height: '12px',
              backgroundColor: 'var(--orange)',
              border: '2px solid white',
              borderRadius: '50%',
              cursor: 'nwse-resize',
              zIndex: 10
            }}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
};
