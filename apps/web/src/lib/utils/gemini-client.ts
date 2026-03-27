// shared by both OCR and Material Identification routes

// The cascade prioritizes gemini-1.5-flash models as they give 1,500 free RPD compared to 2.0-flash's 250 (which often is 0)
const MODEL_CASCADE = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash'
];

export async function callGeminiWithFallback(
  prompt: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg'
) {
  for (const model of MODEL_CASCADE) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: imageBase64
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 256,
            },
          }),
          signal: AbortSignal.timeout(35000),
        }
      );

      if (response.status === 429) {
        const err = await response.json();
        const retryAfter = extractRetryDelay(err); // parse retryDelay from error
        
        // Per-minute limit → wait and retry SAME model
        if (err.error?.details?.some((d: any) =>
          d.violations?.some((v: any) =>
            v.quotaId?.includes('PerMinute')
          )
        )) {
          console.warn(`[Gemini] ${model} minute quota hit, waiting ${retryAfter}s...`);
          await sleep(retryAfter * 1000);
          continue; // retry same model in the loop
        }
        
        // Per-day limit → skip to next model
        console.warn(`[Gemini] ${model} daily quota exhausted, trying next model`);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini ${response.status}: ${errorText}`);
      }
      return { data: await response.json(), model };

    } catch (err) {
      console.error(`[Gemini] ${model} failed:`, err);
    }
  }

  // All models exhausted (either due to 429 dailies on all cascade, or network errors)
  throw new Error('GEMINI_ALL_MODELS_EXHAUSTED');
}

function extractRetryDelay(err: any): number {
  try {
    const delay = err.error.details
      .find((d: any) => d['@type']?.includes('RetryInfo'))
      ?.retryDelay?.replace('s', '');
    return Math.min(parseInt(delay || '10'), 60); // cap at 60s
  } catch { return 10; }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
