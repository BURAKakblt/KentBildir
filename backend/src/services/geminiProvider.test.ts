import type { GoogleGenAI } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { InvalidAIOutputError } from './aiProvider.js';
import { createGeminiProvider, imageAnalysisJsonSchema } from './geminiProvider.js';

function fakeClient(text: string | undefined) {
  const generateContent = vi.fn().mockResolvedValue({ text });
  return { client: { models: { generateContent } } as unknown as GoogleGenAI, generateContent };
}

describe('createGeminiProvider', () => {
  it('model, inline image, abort signal ve structured schema ile çağırır', async () => {
    const { client, generateContent } = fakeClient('{"categoryId":"pothole","confidence":0.75}');
    const provider = createGeminiProvider('test-key-not-used', 'gemini-test-model', client);
    const signal = new AbortController().signal;

    await expect(provider.analyzeImage(Buffer.from('image-bytes'), 'image/jpeg', signal))
      .resolves.toEqual({ categoryId: 'pothole', confidence: 0.75 });

    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-test-model',
      contents: expect.arrayContaining([
        { inlineData: { mimeType: 'image/jpeg', data: Buffer.from('image-bytes').toString('base64') } },
      ]),
      config: expect.objectContaining({
        abortSignal: signal,
        responseMimeType: 'application/json',
        responseJsonSchema: imageAnalysisJsonSchema,
      }),
    }));
    expect(imageAnalysisJsonSchema.properties.categoryId.enum).toHaveLength(6);
  });

  it.each([
    ['bilinmeyen kategori', '{"categoryId":"invented","confidence":0.5}'],
    ['yüksek confidence', '{"categoryId":"pothole","confidence":1.1}'],
    ['negatif confidence', '{"categoryId":"pothole","confidence":-0.1}'],
    ['eksik alan', '{"categoryId":"pothole"}'],
    ['fazla alan', '{"categoryId":"pothole","confidence":0.5,"extra":true}'],
    ['bozuk JSON', '{not-json'],
    ['boş yanıt', undefined],
  ])('%s çıktısını reddeder', async (_name, responseText) => {
    const { client } = fakeClient(responseText);
    const provider = createGeminiProvider('test-key-not-used', 'gemini-test-model', client);
    await expect(provider.analyzeImage(Buffer.from('x'), 'image/png', new AbortController().signal))
      .rejects.toBeInstanceOf(InvalidAIOutputError);
  });
});
