import { GoogleGenAI } from '@google/genai';
import { imageAnalysisSchema } from '../schemas/analysis.js';
import { categories } from '../schemas/report.js';
import { InvalidAIOutputError, type AIProvider } from './aiProvider.js';

const INSTRUCTIONS = `Bu fotoğrafı yalnızca KentBildir şehir sorunu sınıflandırması için analiz et.

İzin verilen kategoriler:

pothole
sidewalk_damage
overflowing_bin
litter
damaged_city_equipment
other

Tanımlar:

pothole:
Yol yüzeyindeki çukur, asfalt kırılması veya belirgin yol hasarı.

sidewalk_damage:
Kırık, çökmüş, bozulmuş veya yaya kullanımını zorlaştıran kaldırım.

overflowing_bin:
Dolmuş veya taşmış çöp konteyneri / çöp kutusu.

litter:
Sokağa, kaldırıma veya çevreye bırakılmış dağınık çöp ve atık.

damaged_city_equipment:
Hasarlı bank, tabela, direk, bariyer veya benzeri belediye/şehir ekipmanı.

other:
Fotoğraf yukarıdaki sınıflardan hiçbirine açıkça uymuyorsa,
şehir sorunu görünmüyorsa veya güvenilir sınıflandırma yapılamıyorsa.

Yeni kategori üretme.

confidence modelin kendi tahmini güven değeridir.
0 ile 1 arasında sayı döndür.`;

export const imageAnalysisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    categoryId: { type: 'string', enum: [...categories] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['categoryId', 'confidence'],
} as const;

export function createGeminiProvider(apiKey: string, model: string, client = new GoogleGenAI({ apiKey })): AIProvider {
  return {
    async analyzeImage(buffer, mime, signal) {
      const response = await client.models.generateContent({
        model,
        contents: [{ text: INSTRUCTIONS }, { inlineData: { mimeType: mime, data: buffer.toString('base64') } }],
        config: {
          abortSignal: signal,
          responseMimeType: 'application/json',
          responseJsonSchema: imageAnalysisJsonSchema,
        },
      });
      if (!response.text) throw new InvalidAIOutputError('AI boş yanıt döndürdü.');
      let value: unknown;
      try { value = JSON.parse(response.text); }
      catch { throw new InvalidAIOutputError('AI çıktısı geçerli JSON değil.'); }
      const parsed = imageAnalysisSchema.safeParse(value);
      if (!parsed.success) throw new InvalidAIOutputError('AI çıktısı şemaya uymuyor.');
      return parsed.data;
    },
  };
}
