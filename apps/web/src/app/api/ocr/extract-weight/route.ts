import { NextRequest, NextResponse } from 'next/server';

/**
 * OCR Weight Extraction API Route
 * Receives base64 image, calls OCR.space, extracts weight value.
 * Uses OCR Engine 2 for better numeric recognition on weighing scales.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('--- [OCR API] Received request ---');
    const { image } = await request.json();

    if (!image) {
      console.log('--- [OCR API] ERROR: No image provided ---');
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    // Strip data URI prefix if present — OCR.space expects raw base64
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    console.log(`--- [OCR API] Image base64 length: ${base64Data.length} chars ---`);

    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
      console.log('--- [OCR API] DEV_MODE: No API key configured ---');
      // Return a simulated result for development when no API key is configured
      return NextResponse.json({
        success: true,
        extractedWeight: parseFloat((Math.random() * 200 + 50).toFixed(2)),
        confidence: Math.floor(Math.random() * 30 + 70),
        rawText: 'DEV_MODE: OCR_SPACE_API_KEY not configured',
      });
    }

    console.log('--- [OCR API] Calling OCR.space... ---');
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

    console.log(`--- [OCR API] OCR.space HTTP status: ${ocrRes.status} ---`);

    if (!ocrRes.ok) {
      if (ocrRes.status === 403) {
        console.error('--- [OCR API] ERROR: Invalid OCR API key ---');
        return NextResponse.json({ success: false, error: 'Invalid OCR API key' }, { status: 403 });
      }
      console.error(`--- [OCR API] ERROR: API status ${ocrRes.status} ---`);
      return NextResponse.json({ success: false, error: `OCR API error: ${ocrRes.status}` }, { status: 500 });
    }

    const ocrData = await ocrRes.json();
    console.log(`--- [OCR API] OCR.space Response IsErroredOnProcessing: ${ocrData.IsErroredOnProcessing} ---`);

    if (ocrData.IsErroredOnProcessing) {
      console.error('--- [OCR API] OCR Error:', ocrData.ErrorMessage);
      return NextResponse.json({
        success: false,
        error: ocrData.ErrorMessage?.[0] || 'OCR processing failed',
        rawText: '',
      });
    }

    const rawText = ocrData.ParsedResults?.[0]?.ParsedText || '';
    console.log('--- [OCR API] Extracted Raw Text:', rawText.replace(/\r?\n/g, '\\n'), '---');
    let confidence = ocrData.ParsedResults?.[0]?.TextOverlay?.Lines?.[0]?.MaxHeight
      ? 85  // Approximate confidence when text overlay is available
      : 60;

    // Extract weight using regex — handles:
    //   "142.50 kg", "142,50 KG", "142.5 Kg", "5 kg"
    const weightRegex = /(\d{1,5}[.,]?\d{0,2})\s*(?:kg|KG|Kg|Kgs|x9|k9|«9)/i;
    let match = rawText.match(weightRegex);
    let weight = NaN;

    if (match) {
      weight = parseFloat(match[1].replace(',', '.'));
    } else {
      // Fallback: Extremely aggressive regex to find the LARGEST isolated number on the screen.
      // E.g. raw text "TARE\nESSAE\n14251\nZERO" -> extracts 14251
      // E.g. raw text "14250." -> extracts 14250
      const allNumbersMatch = rawText.match(/\b\d+(?:[.,]\d+)?\b/g);
      
      if (allNumbersMatch && allNumbersMatch.length > 0) {
        // Filter out tiny numbers (like year 2024, or tiny weights like 0.0)
        // Sort by magnitude, assuming the main reading is the largest number on the board
        const parsedNums = allNumbersMatch
          .map((n: string) => parseFloat(n.replace(',', '.')))
          .filter((n: number) => !isNaN(n) && n > 0.5);
          
        if (parsedNums.length > 0) {
           // Sort descending and pick the largest
           parsedNums.sort((a: number, b: number) => b - a);
           weight = parsedNums[0];
           
           // If we fall back to a raw number without units, confidence drops a bit
           confidence = Math.max(40, confidence - 20);
        }
      }
    }

    if (!isNaN(weight) && weight > 0) {
      return NextResponse.json({
        success: true,
        extractedWeight: weight,
        confidence,
        rawText,
      });
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
