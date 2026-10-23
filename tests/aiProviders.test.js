import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateWithProvider,
  listModelsWithProvider,
  isQuotaOrRateError,
  trimToWordLimit
} from '../server/aiProviders.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AI provider adapters and token/word limits', () => {
  it('calls Gemini through the server adapter and returns provider-reported token usage', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'A bright new chapter.' }] } }],
        usageMetadata: { promptTokenCount: 31, candidatesTokenCount: 7, totalTokenCount: 38 }
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithProvider({
      providerId: 'gemini',
      apiKey: 'server-side-test-key',
      model: 'gemini-3.8-flash',
      prompt: 'Write a short chapter heading.',
      maxWords: 8
    });

    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toContain('models/gemini-3.8-flash:generateContent');
    expect(url).not.toContain('server-side-test-key');
    expect(request.headers['x-goog-api-key']).toBe('server-side-test-key');
    const generationConfig = JSON.parse(request.body).generationConfig;
    expect(generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(1024);
    expect(generationConfig).not.toHaveProperty('temperature');
    expect(generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'low' });
    expect(result.text).toBe('A bright new chapter.');
    expect(result.usage).toEqual({ promptTokens: 31, completionTokens: 7, totalTokens: 38 });
  });

  it('explains when the app server cannot reach Google Gemini', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    await expect(generateWithProvider({
      providerId: 'gemini',
      apiKey: 'server-side-test-key',
      model: 'gemini-3.8-flash',
      prompt: 'Reply with exactly one word: connected',
      maxWords: 2
    })).rejects.toThrow('The Google Gemini API at generativelanguage.googleapis.com could not be reached. This server needs outbound HTTPS access to generativelanguage.googleapis.com.');
  });

  it('discovers only Gemini models with text-generation support without exposing the key in the URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        models: [
          { name: 'models/gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
          { name: 'models/gemini-3.8-live', displayName: 'Gemini 3.8 Live', supportedGenerationMethods: ['bidiGenerateContent'] }
        ]
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    const models = await listModelsWithProvider({ providerId: 'gemini', apiKey: 'private-gemini-key' });
    const [url, request] = fetchMock.mock.calls[0];

    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000');
    expect(url).not.toContain('private-gemini-key');
    expect(request.headers['x-goog-api-key']).toBe('private-gemini-key');
    expect(models.map((model) => model.id)).toEqual(['gemini-3.8-flash']);
  });

  it('uses the OpenAI Responses API and normalizes its usage fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        output_text: 'The tide carried the letter home.',
        usage: { input_tokens: 24, output_tokens: 9, total_tokens: 33 }
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithProvider({
      providerId: 'openai',
      apiKey: 'sk-server-side-test-key',
      model: 'gpt-5-mini',
      prompt: 'Write a short story sentence.',
      maxWords: 10
    });

    const [url, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(request.headers.Authorization).toBe('Bearer sk-server-side-test-key');
    expect(body.model).toBe('gpt-5-mini');
    expect(body.max_output_tokens).toBeGreaterThanOrEqual(256);
    expect(body.instructions).toContain('expert, careful book editor');
    expect(result.text).toBe('The tide carried the letter home.');
    expect(result.usage).toEqual({ promptTokens: 24, completionTokens: 9, totalTokens: 33 });
  });

  it('detects quota exhaustion and trims without destroying field line breaks', () => {
    expect(isQuotaOrRateError(429, 'too many requests')).toBe(true);
    expect(isQuotaOrRateError(403, 'invalid key')).toBe(false);
    expect(trimToWordLimit('one\n\ntwo three four', 3)).toBe('one\n\ntwo three');
  });
});
