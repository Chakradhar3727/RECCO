import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithFallback } from '../../../../lib/utils/gemini-client';

/**
 * AI Material Identification API Route
 * Receives a base64 image, calls Google Gemini Vision API to identify plastic material type.
 * Returns the closest CPCB category match.
 */

const VALID_MATERIALS = ['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'MLP', 'PLASTIC_SHEET', 'MIXED'] as const;

const GEMINI_PROMPT = `You are a plastic material classification expert for India's CPCB (Central Pollution Control Board) recycling system.

Analyze this photograph of plastic waste material and identify which CPCB category it belongs to.

The valid categories are:
- PET: PET Bottles (water bottles, soft drink bottles, oil bottles)
- HDPE: HDPE Containers (milk jugs, detergent bottles, jerry cans)
- PVC: PVC Rigid (pipes, fittings, window profiles)
- LDPE: LDPE Film (carry bags, shrink wrap, agricultural film)
- PP: PP Containers (food containers, bottle caps, auto parts)
- PS: PS / Thermocol (thermocol, disposable cups, packaging foam)
- MLP: Multi-Layer Plastic (chips packets, biscuit wrappers, tetrapaks)
- PLASTIC_SHEET: Plastic Sheet / Cover (tarpaulin, greenhouse covers, plastic sheets)
- MIXED: Mixed Plastic (unsorted mixed plastic waste)

Respond with ONLY a JSON object in this exact format (no markdown, no code blocks):
{"material": "PET", "confidence": 85, "reasoning": "The image shows clear PET water bottles with typical shape and transparency"}

Rules:
- "material" must be exactly one of: PET, HDPE, PVC, LDPE, PP, PS, MLP, PLASTIC_SHEET, MIXED
- "confidence" must be a number between 0 and 100
- If the image is unclear or doesn't show plastic, set material to "MIXED" with low confidence
- Be conservative with confidence — only give above 80 if very certain`;

export async function POST(request: NextRequest) {
  try {
    console.log('--- [Material AI] Received request ---');
    const { image, expectedMaterial } = await request.json();

    if (!image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    if (process.env.GEMINI_MOCK === 'true') {
      console.log('--- [Material AI] DEV_MODE: GEMINI_MOCK=true ---');
      let targetMaterial = 'MIXED';
      if (expectedMaterial && VALID_MATERIALS.includes(expectedMaterial as any)) {
        targetMaterial = expectedMaterial;
      } else {
        const mockMaterials = VALID_MATERIALS.filter(m => m !== 'MIXED');
        targetMaterial = mockMaterials[Math.floor(Math.random() * mockMaterials.length)];
      }

      return NextResponse.json({
        success: true,
        detectedMaterial: targetMaterial,
        confidence: 88,
        reasoning: 'DEV_MODE: GEMINI_MOCK=true',
        flag: 'MATCH',
        mock: true
      });
    }

    // Strip data URI prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    console.log('--- [Material AI] Calling Gemini Vision API with Fallback... ---');

    let geminiData;
    let modelUsed;
    try {
      const response = await callGeminiWithFallback(GEMINI_PROMPT, base64Data, 'image/jpeg');
      geminiData = response.data;
      modelUsed = response.model;
    } catch (err: any) {
      if (err.message === 'GEMINI_ALL_MODELS_EXHAUSTED') {
        console.warn('--- [Material AI] All Gemini models quota exhausted. Returning AI_PENDING ---');
        return NextResponse.json(
          { success: true, flag: 'AI_PENDING', reason: 'quota_exhausted' },
          { status: 200 } // ✅ 200 is correct — triggers State 12 in your UI
        );
      }
      return NextResponse.json(
        { success: false, error: 'material_identification_failed' },
        { status: 500 }
      );
    }

    const rawResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('--- [Material AI] Gemini raw response:', rawResponse, '---');

    // Parse the JSON response from Gemini
    try {
      // Strip markdown code fences if present
      const cleaned = rawResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const material = VALID_MATERIALS.includes(parsed.material) ? parsed.material : 'MIXED';
      const confidence = typeof parsed.confidence === 'number'
        ? Math.min(100, Math.max(0, Math.round(parsed.confidence)))
        : 50;

      return NextResponse.json({
        success: true,
        detectedMaterial: material,
        confidence,
        reasoning: parsed.reasoning || '',
        model: modelUsed
      });
    } catch (parseErr) {
      console.error('--- [Material AI] Failed to parse Gemini response:', parseErr, '---');
      return NextResponse.json({
        success: true,
        detectedMaterial: 'MIXED',
        confidence: 30,
        reasoning: `Could not parse AI response: ${rawResponse.substring(0, 200)}`,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('--- [Material AI] Error:', message, '---');
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
