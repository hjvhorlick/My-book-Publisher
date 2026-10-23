import React, { useEffect, useRef } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline
} from 'lucide-react';
import AiFieldButton from './AiFieldButton';
import {
  countRichTextWords,
  normalizeRichHtml,
  plainTextToRichHtml,
  sanitizeRichHtml
} from '../utils/richText';

export default function RichTextField({
  value = '',
  onChange,
  onBlur,
  placeholder = '',
  rows = 4,
  className = '',
  style = {},
  readOnly = false,
  aiConfigured = false,
  aiContext = {},
  ariaLabel = 'Page text editor',
  showWordCount = true,
  compactToolbar = false,
  onPaste
}) {
  const editorRef = useRef(null);
  const normalizedValue = normalizeRichHtml(value);
  const lastValueRef = useRef(normalizedValue);
  const renderedHtmlRef = useRef(normalizedValue);
  const selectionRef = useRef(null);
  if (normalizedValue !== lastValueRef.current) {
    renderedHtmlRef.current = normalizedValue;
  }

  useEffect(() => {
    if (!editorRef.current || document.activeElement === editorRef.current) return;
    if (editorRef.current.innerHTML !== normalizedValue) {
      editorRef.current.innerHTML = normalizedValue;
    }
    lastValueRef.current = normalizedValue;
    renderedHtmlRef.current = normalizedValue;
  }, [normalizedValue]);

  const handleInput = () => {
    if (!editorRef.current || readOnly) return;
    // Sanitize what is persisted without rewriting the live DOM on every keystroke;
    // replacing contenteditable HTML mid-input can collapse the caret and break paste/typing.
    const safeHtml = sanitizeRichHtml(editorRef.current.innerHTML);
    lastValueRef.current = safeHtml;
    onChange?.(safeHtml);
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (!editorRef.current || !selectionRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(selectionRef.current);
  };

  const applyCommand = (command, valueArg = null) => {
    if (!editorRef.current || readOnly) return;
    editorRef.current.focus();
    if (command === 'foreColor') {
      document.execCommand('styleWithCSS', false, true);
      restoreSelection();
    }
    document.execCommand(command, false, valueArg);
    handleInput();
  };

  const handlePaste = (event) => {
    onPaste?.(event);
    if (event.defaultPrevented || readOnly) return;
    const pastedHtml = event.clipboardData?.getData('text/html');
    if (pastedHtml) {
      event.preventDefault();
      document.execCommand('insertHTML', false, sanitizeRichHtml(pastedHtml));
      handleInput();
    }
  };

  const insertGeneratedText = (text, mode) => {
    const generatedHtml = plainTextToRichHtml(text);
    const currentHtml = sanitizeRichHtml(editorRef.current?.innerHTML || normalizedValue);
    const nextHtml = mode === 'append' && currentHtml
      ? `${currentHtml}<p></p>${generatedHtml}`
      : generatedHtml;
    if (editorRef.current) editorRef.current.innerHTML = nextHtml;
    lastValueRef.current = nextHtml;
    onChange?.(nextHtml);
  };

  const toolbarButton = (label, Icon, command) => (
    <button
      key={label}
      type="button"
      disabled={readOnly}
      aria-label={label}
      title={label}
      onMouseDown={(event) => {
        event.preventDefault();
        saveSelection();
      }}
      onClick={() => applyCommand(command)}
      className={`${compactToolbar ? 'min-h-7 min-w-7' : 'min-h-8 min-w-8'} rounded-lg flex items-center justify-center disabled:opacity-40`}
      style={{ color: '#FDE08D', backgroundColor: 'rgba(6, 17, 40, 0.85)', border: '1px solid rgba(229, 184, 75, 0.42)' }}
    >
      <Icon className={compactToolbar ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
    </button>
  );

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Text formatting">
        {toolbarButton('Bold', Bold, 'bold')}
        {toolbarButton('Italic', Italic, 'italic')}
        {toolbarButton('Underline', Underline, 'underline')}
        <span aria-hidden="true" className="mx-0.5 h-5 w-px" style={{ backgroundColor: 'rgba(229,184,75,.4)' }} />
        {toolbarButton('Align text left', AlignLeft, 'justifyLeft')}
        {toolbarButton('Align text center', AlignCenter, 'justifyCenter')}
        {toolbarButton('Align text right', AlignRight, 'justifyRight')}
        <label className={`${compactToolbar ? 'min-h-7 gap-1 px-1.5' : 'min-h-8 gap-1.5 px-2'} inline-flex items-center rounded-lg text-[10px] font-bold`} style={{ color: '#FDE08D', backgroundColor: 'rgba(6,17,40,.85)', border: '1px solid rgba(229,184,75,.42)' }}>
          {compactToolbar ? 'Color' : 'Text color'}
          <input
            type="color"
            aria-label="Text color"
            defaultValue="#1F2937"
            disabled={readOnly}
            onMouseDown={saveSelection}
            onChange={(event) => applyCommand('foreColor', event.target.value)}
            className={`${compactToolbar ? 'h-4 w-5' : 'h-5 w-6'} cursor-pointer rounded border-0 bg-transparent p-0 disabled:opacity-40`}
          />
        </label>
        {showWordCount && (
          <span className="ml-auto px-2 text-[10px] font-semibold" style={{ color: '#F3D78B' }}>
            {countRichTextWords(value)} words
          </span>
        )}
        <AiFieldButton
          enabled={aiConfigured && !readOnly}
          context={aiContext}
          currentValue={value}
          onInsert={insertGeneratedText}
          compact
        />
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        aria-readonly={readOnly}
        aria-placeholder={placeholder}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: renderedHtmlRef.current }}
        data-placeholder={placeholder}
        spellCheck="true"
        onInput={handleInput}
        onPaste={handlePaste}
        onBlur={onBlur}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        className={`min-h-[96px] w-full rounded-lg outline-none overflow-y-auto whitespace-pre-wrap break-words ${className}`}
        style={{ minHeight: `${Math.max(3, Number(rows) || 4) * 1.55}em`, ...style }}
      />
    </div>
  );
}
