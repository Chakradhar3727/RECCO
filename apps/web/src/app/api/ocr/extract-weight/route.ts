import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithFallback } from '../../../../lib/utils/gemini-client';

/**
 * AI Weight Extraction API Route
 * Receives a base64 image, calls Google Gemini Vision API to extract the numeric weight from digital scales.
 */

const GEMINI_PROMPT = `You are a highly precise digital scale OCR system.
Analyze this image of a weighing scale and extract the exact net weight displayed on the screen.

Respond with ONLY a JSON object in this exact format (no markdown, no code blocks):
{"weight": 142.50, "confidence": 95, "unit": "kg"}

Rules:
- "weight" must be a number (e.g. 142.50).
- If the image shows a digital scale with no clear decimal point due to glare (e.g., reads "14250" but it's clearly a large platform scale weighing bales), logically infer the correct weight is 142.50. Bulk platform scales typically show 2 decimal places.
- "confidence" must be a number between 0 and 100 based on how clearly the number is visible.
- "unit" should be "kg" or "g" if visible, otherwise "unknown".
- If no scale or number is visible at all, return weight: null and confidence: 0.`;

export async function POST(request: NextRequest) {
  try {
    console.log('--- [Weight OCR AI] Received request ---');
    const { image } = await request.json();

    if (!image) {
      console.log('--- [Weight OCR AI] ERROR: No image provided ---');
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    if (process.env.GEMINI_MOCK === 'true') {
      console.log('--- [Weight OCR AI] DEV_MODE: GEMINI_MOCK=true ---');
      return NextResponse.json({
        success: true,
        extractedWeight: 142.50,
        confidence: 94,
        rawText: '142.50 kg',
        mock: true
      });
    }

    // Strip data URI prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    console.log(`--- [Weight OCR AI] Image base64 length: ${base64Data.length} chars ---`);

    console.log('--- [Weight OCR AI] Calling Gemini Vision API with Fallback... ---');

    let geminiData;
    let modelUsed;
    try {
      const response = await callGeminiWithFallback(GEMINI_PROMPT, base64Data, 'image/jpeg');
      geminiData = response.data;
      modelUsed = response.model;
    } catch (err: any) {
      if (err.message === 'GEMINI_ALL_MODELS_EXHAUSTED') {
        return NextResponse.json(
          { success: false, flag: 'AI_PENDING', reason: 'quota_exhausted', error: 'All models quota exhausted' },
          { status: 200 } 
        );
      }
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }

    const rawResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('--- [Weight OCR AI] Gemini raw response:', rawResponse, '---');

    // Parse the JSON response from Gemini
    try {
      // Strip markdown code fences if present
      const cleaned = rawResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const weight = typeof parsed.weight === 'number' ? parsed.weight : parseFloat(parsed.weight);
      const confidence = typeof parsed.confidence === 'number'
        ? Math.min(100, Math.max(0, Math.round(parsed.confidence)))
        : 50;

      if (!isNaN(weight) && weight !== null && weight > 0) {
        return NextResponse.json({
          success: true,
          extractedWeight: weight,
          confidence,
          rawText: rawResponse,
          model: modelUsed
        });
      }

      return NextResponse.json({
        success: false,
        extractedWeight: null,
        confidence: 0,
        rawText: rawResponse,
        error: 'Could not extract a valid weight from the image',
      });

    } catch (parseErr) {
      console.error('--- [Weight OCR AI] Failed to parse Gemini response:', parseErr, '---');
      return NextResponse.json({
        success: false,
        extractedWeight: null,
        confidence: 0,
        rawText: rawResponse,
        error: 'Failed to interpret AI response',
      });
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('--- [Weight OCR AI] Error:', message, '---');
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
