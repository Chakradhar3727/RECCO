/**
 * RECCO — Photo Watermarking (Client-Side Canvas API)
 *
 * Bakes a semi-transparent watermark overlay into the captured photo
 * containing the session ID and UTC timestamp. This provides forensic
 * traceability and deters photo reuse across sessions.
 */

interface WatermarkOptions {
  sessionId: string;
  timestamp?: Date;
  fontSize?: number;
  opacity?: number;
}

/**
 * Applies a watermark to a base64 data-URL image.
 *
 * @param dataUrl   - The original image as a data-URL
 * @param options   - Watermark configuration
 * @returns The watermarked image as a JPEG data-URL
 */
export async function watermarkPhoto(
  dataUrl: string,
  options: WatermarkOptions
): Promise<string> {
  const { sessionId, timestamp = new Date(), fontSize = 14, opacity = 0.35 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Configure watermark text
      ctx.globalAlpha = opacity;
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;

      const lines = [
        `RECCO | ${sessionId}`,
        timestamp.toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      ];

      const padding = 10;
      const lineHeight = fontSize + 6;
      const y = img.height - padding - (lines.length * lineHeight);

      lines.forEach((line, i) => {
        const textY = y + (i * lineHeight) + fontSize;
        // Stroke for readability on light backgrounds
        ctx.strokeText(line, padding, textY);
        ctx.fillText(line, padding, textY);
      });

      ctx.globalAlpha = 1.0;

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Failed to load image for watermarking'));
    img.src = dataUrl;
  });
}
