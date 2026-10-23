import { describe, expect, it, vi } from 'vitest';
import { handleApiKeyPaste } from '../src/components/AiProviderSettingsModal.jsx';

describe('AI provider API-key paste handling', () => {
  it('stores trimmed clipboard text for ordinary Ctrl+V or Cmd+V and reports success', () => {
    const apiKey = 'AIza-example-api-key';
    const event = {
      clipboardData: {
        getData: vi.fn((type) => (type === 'text/plain' ? `\n ${apiKey} \n` : ''))
      },
      preventDefault: vi.fn()
    };
    const onKey = vi.fn();
    const onFeedback = vi.fn();

    expect(handleApiKeyPaste(event, { onKey, onFeedback })).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.clipboardData.getData).toHaveBeenCalledWith('text/plain');
    expect(onKey).toHaveBeenCalledOnce();
    expect(onKey).toHaveBeenCalledWith(apiKey);
    expect(onFeedback).toHaveBeenCalledWith({
      type: 'success',
      text: 'Key pasted. Use the eye to verify it, then click Save settings.'
    });
  });

  it('allows native browser paste when clipboard text is not exposed to the page', () => {
    const event = {
      clipboardData: { getData: vi.fn(() => '') },
      preventDefault: vi.fn()
    };
    const onKey = vi.fn();
    const onFeedback = vi.fn();

    expect(handleApiKeyPaste(event, { onKey, onFeedback })).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(onKey).not.toHaveBeenCalled();
    expect(onFeedback).toHaveBeenCalledWith({
      type: 'warning',
      text: 'Clipboard text is unavailable to this page; allowing the browser’s normal paste. If nothing appears, use the Paste button or check clipboard permission.'
    });
  });
});
