import { useState, useRef, useCallback, useEffect } from 'react';
import clsx from 'clsx';

interface ResizableChatPanelProps {
  /** Main content (e.g., your text editor) */
  children: React.ReactNode;
  /** Chat panel content */
  chatPanel: React.ReactNode;
  /** Default width of chat panel in pixels */
  defaultChatWidth?: number;
  /** Minimum width of chat panel in pixels */
  minChatWidth?: number;
  /** Maximum width of chat panel as percentage of viewport */
  maxChatWidthPercent?: number;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
}

export const ResizableChatPanel = ({
  children,
  chatPanel,
  defaultChatWidth = 400,
  minChatWidth = 300,
  maxChatWidthPercent = 60,
  defaultCollapsed = false,
}: ResizableChatPanelProps) => {
  const [chatWidth, setChatWidth] = useState(defaultChatWidth);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;

      // Calculate max width based on viewport
      const maxWidth = (window.innerWidth * maxChatWidthPercent) / 100;

      // Constrain width between min and max
      const constrainedWidth = Math.max(
        minChatWidth,
        Math.min(newWidth, maxWidth),
      );

      setChatWidth(constrainedWidth);
    },
    [isResizing, minChatWidth, maxChatWidthPercent],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add event listeners for mouse move and up
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 10; // pixels to resize per key press

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const maxWidth = (window.innerWidth * maxChatWidthPercent) / 100;
        const newWidth = Math.min(chatWidth + step, maxWidth);
        setChatWidth(newWidth);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newWidth = Math.max(chatWidth - step, minChatWidth);
        setChatWidth(newWidth);
      }
    },
    [chatWidth, minChatWidth, maxChatWidthPercent],
  );

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full overflow-hidden"
    >
      {/* Main content area */}
      <div
        className={clsx(
          'flex-1 overflow-auto transition-[width] duration-200 ease-in-out',
          'min-w-0',
        )}
        style={{
          width: isCollapsed ? '100%' : `calc(100% - ${chatWidth}px)`,
        }}
      >
        {children}
      </div>

      {/* Chat panel */}
      {!isCollapsed && (
        <>
          {/* Resize handle */}
          <button
            type="button"
            className={clsx(
              'group relative z-10 flex w-2 flex-shrink-0 cursor-col-resize items-center justify-center border-none',
              'bg-transparent transition-colors duration-150 hover:bg-black/5',
              'focus:ring-primary-500 focus:ring-2 focus:outline-none',
            )}
            onMouseDown={handleMouseDown}
            onKeyDown={handleKeyDown}
            aria-label="Resize chat panel - use arrow keys to adjust width"
          >
            <div className="h-full w-0.5 bg-black/10 transition-colors duration-150 group-hover:bg-black/30" />
          </button>

          {/* Chat panel content */}
          <div
            className="relative flex h-full flex-shrink-0 flex-col overflow-hidden bg-white"
            style={{ width: `${chatWidth}px` }}
          >
            {chatPanel}
          </div>
        </>
      )}

      {/* Collapse/Expand button */}
      <button
        className={clsx(
          'absolute top-1/2 right-0 z-20 flex h-14 w-7 -translate-y-1/2 items-center justify-center',
          'border border-r-0 border-gray-200 bg-white shadow-sm transition-all duration-200',
          'hover:bg-gray-50 hover:shadow-md',
          isCollapsed && '-right-7',
        )}
        style={{ borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}
        onClick={toggleCollapse}
        aria-label={isCollapsed ? 'Open chat panel' : 'Close chat panel'}
        type="button"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={clsx(
            'text-gray-600 transition-transform duration-200',
            isCollapsed && 'rotate-180',
          )}
        >
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
};
