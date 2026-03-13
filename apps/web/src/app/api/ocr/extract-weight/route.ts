import { NextRequest, NextResponse } from 'next/server';

/**
 * OCR Weight Extraction API Route
 * Receives base64 image, calls OCR.space, extracts weight value.
 * Uses OCR Engine 2 for better numeric recognition on weighing scales.
 */
export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    // Strip data URI prefix if present — OCR.space expects raw base64
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
      // Return a simulated result for development when no API key is configured
      return NextResponse.json({
        success: true,
        extractedWeight: parseFloat((Math.random() * 200 + 50).toFixed(2)),
        confidence: Math.floor(Math.random() * 30 + 70),
        rawText: 'DEV_MODE: OCR_SPACE_API_KEY not configured',
      });
    }

    // Call OCR.space API
    const ocrRes = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        apikey: apiKey,
      },
      body: new URLSearchParams({
        base64Image: `data:image/jpeg;base64,${base64Data}`,
        OCREngine: '2',
        detectOrientation: 'true',
        scale: 'true',
        isTable: 'false',
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!ocrRes.ok) {
      if (ocrRes.status === 403) {
        return NextResponse.json({ success: false, error: 'Invalid OCR API key' }, { status: 403 });
      }
      return NextResponse.json({ success: false, error: `OCR API error: ${ocrRes.status}` }, { status: 500 });
    }

    const ocrData = await ocrRes.json();

    if (ocrData.IsErroredOnProcessing) {
      return NextResponse.json({
        success: false,
        error: ocrData.ErrorMessage?.[0] || 'OCR processing failed',
        rawText: '',
      });
    }

    const rawText = ocrData.ParsedResults?.[0]?.ParsedText || '';
    const confidence = ocrData.ParsedResults?.[0]?.TextOverlay?.Lines?.[0]?.MaxHeight
      ? 85  // Approximate confidence when text overlay is available
      : 60;

    // Extract weight using regex — handles:
    //   "142.50 kg", "142,50 KG", "142.5 Kg", "5 kg"
    const weightRegex = /(\d{1,5}[.,]?\d{0,2})\s*(?:kg|KG|Kg)/i;
    const match = rawText.match(weightRegex);

    if (match) {
      const weightStr = match[1].replace(',', '.');
      const weight = parseFloat(weightStr);

      if (!isNaN(weight) && weight > 0) {
        return NextResponse.json({
          success: true,
          extractedWeight: weight,
          confidence,
          rawText,
        });
      }
    }

    // Fallback: try to find any number that could be a weight
    const numberRegex = /(\d{1,5}[.,]\d{1,2})/;
    const numMatch = rawText.match(numberRegex);
    if (numMatch) {
      const weight = parseFloat(numMatch[1].replace(',', '.'));
      if (!isNaN(weight) && weight > 0) {
        return NextResponse.json({
          success: true,
          extractedWeight: weight,
          confidence: Math.max(40, confidence - 20),
          rawText,
        });
      }
    }

    return NextResponse.json({
      success: false,
      extractedWeight: null,
      confidence: 0,
      rawText,
      error: 'Could not extract weight from image',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
