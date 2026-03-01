import { useRef, useEffect } from 'react';

/**
 * Simple Rich Text Editor Component
 * Sử dụng contenteditable div để tạo editor đơn giản
 */
export default function SimpleRichTextEditor({ value, onChange, placeholder, disabled }) {
  const editorRef = useRef(null);
  const isUserTyping = useRef(false);

  // Sync external value changes to editor
  useEffect(() => {
    if (editorRef.current && !isUserTyping.current) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Handle input change
  const handleInput = () => {
    if (editorRef.current) {
      isUserTyping.current = true;
      onChange(editorRef.current.innerHTML);
      setTimeout(() => {
        isUserTyping.current = false;
      }, 100);
    }
  };

  // Format text functions
  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-2 flex flex-wrap gap-1">
        {/* Bold */}
        <button
          type="button"
          onClick={() => formatText('bold')}
          disabled={disabled}
          className="px-3 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
          title="Bold (Ctrl+B)"
        >
          <span className="font-bold">B</span>
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => formatText('italic')}
          disabled={disabled}
          className="px-3 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
          title="Italic (Ctrl+I)"
        >
          <span className="italic">I</span>
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => formatText('underline')}
          disabled={disabled}
          className="px-3 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
          title="Underline (Ctrl+U)"
        >
          <span className="underline">U</span>
        </button>

        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>

        {/* Heading H2 */}
        <button
          type="button"
          onClick={() => formatText('formatBlock', '<h2>')}
          disabled={disabled}
          className="px-3 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-sm"
          title="Heading 2"
        >
          H2
        </button>

        {/* Heading H3 */}
        <button
          type="button"
          onClick={() => formatText('formatBlock', '<h3>')}
          disabled={disabled}
          className="px-3 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-sm"
          title="Heading 3"
        >
          H3
        </button>

        {/* Paragraph */}
        <button
          type="button"
          onClick={() => formatText('formatBlock', '<p>')}
          disabled={disabled}
          className="px-3 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-sm"
          title="Paragraph"
        >
          P
        </button>

        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>

        {/* Unordered List */}
        <button
          type="button"
          onClick={() => formatText('insertUnorderedList')}
          disabled={disabled}
          className="px-3 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
          title="Bullet List"
        >
          • List
        </button>

        {/* Ordered List */}
        <button
          type="button"
          onClick={() => formatText('insertOrderedList')}
          disabled={disabled}
          className="px-3 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
          title="Numbered List"
        >
          1. List
        </button>

        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>

        {/* Link */}
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter URL:');
            if (url) formatText('createLink', url);
          }}
          disabled={disabled}
          className="px-3 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-sm"
          title="Insert Link"
        >
          🔗 Link
        </button>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 focus:outline-none dark:bg-slate-900 dark:text-white prose prose-sm max-w-none"
        suppressContentEditableWarning
        data-placeholder={placeholder || 'Nhập nội dung...'}
      />


      <style>
        {`
          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: #94a3b8;
            pointer-events: none;
          }
          [contenteditable]:focus {
            outline: none;
          }
          [contenteditable] h2 {
            font-size: 1.5em;
            font-weight: bold;
            margin: 0.5em 0;
            color: inherit;
          }
          [contenteditable] h3 {
            font-size: 1.25em;
            font-weight: bold;
            margin: 0.5em 0;
            color: inherit;
          }
          [contenteditable] p {
            margin: 0.5em 0;
            color: inherit;
          }
          [contenteditable] ul, [contenteditable] ol {
            margin: 0.5em 0;
            padding-left: 2em;
            color: inherit;
          }
          [contenteditable] a {
            color: #3b82f6;
            text-decoration: underline;
          }
        `}
      </style>
    </div>
  );
}
