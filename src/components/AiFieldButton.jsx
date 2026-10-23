import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { buildAiFieldPrompt, getAiFieldProfile } from '../data/aiPromptCatalog';
import AiWritingDialog from './AiWritingDialog';

export default function AiFieldButton({
  enabled = false,
  context = {},
  currentValue = '',
  onInsert,
  className = '',
  compact = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  if (!enabled) return null;

  const profile = getAiFieldProfile(context.categoryId || context.publicationType, context.fieldKey);
  const resolvedContext = {
    ...context,
    fieldLabel: context.fieldLabel || profile.label,
    format: context.format || profile.format,
    maxWords: context.maxWords || profile.maxWords,
    currentText: currentValue,
    bookTitle: context.bookTitle || context.project?.title
  };

  const openDialog = () => {
    // Build the prompt only on the explicit field-level click; it is not displayed in the page.
    setPrompt(buildAiFieldPrompt(resolvedContext));
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label={`Generate ${resolvedContext.fieldLabel} with AI`}
        title={`Generate ${resolvedContext.fieldLabel} with AI`}
        className={`inline-flex items-center justify-center gap-1 rounded-lg font-bold transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDE08D] ${className}`}
        style={{
          minHeight: compact ? 28 : 34,
          padding: compact ? '4px 7px' : '6px 10px',
          backgroundColor: 'rgba(6, 17, 40, 0.92)',
          color: '#FDE08D',
          border: '1px solid rgba(229, 184, 75, 0.65)'
        }}
      >
        <Sparkles className="w-3.5 h-3.5 text-[#F5C451]" />
        <span className="whitespace-nowrap text-[10px]">Write with AI</span>
      </button>
      {isOpen && (
        <AiWritingDialog
          open={isOpen}
          prompt={prompt}
          context={resolvedContext}
          onClose={() => setIsOpen(false)}
          onInsert={(text, mode) => {
            onInsert?.(text, mode);
            setIsOpen(false);
          }}
        />
      )}
    </>
  );
}
