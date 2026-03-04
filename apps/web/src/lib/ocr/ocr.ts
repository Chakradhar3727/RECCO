/**
 * Utility for parsing text from images using OCR.space standard API.
 */

export interface OcrResponse {
    ParsedResults: {
        ParsedText: string;
        ErrorMessage: string;
        ErrorDetails: string;
    }[];
    OCRExitCode: number;
    IsErroredOnProcessing: boolean;
    ProcessingTimeInMilliseconds: string;
    ErrorMessage: string | string[];
}

export async function parseTextFromImage(imageUrl: string): Promise<string | null> {
    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
        console.warn("OCR_SPACE_API_KEY is not set.");
        return null;
    }

    try {
        const response = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            headers: {
                "apikey": apiKey,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                url: imageUrl,
                language: "eng",
                isOverlayRequired: "false",
            }),
        });

        if (!response.ok) {
            console.error("OCR API responded with status:", response.status);
            return null;
        }

        const data = (await response.json()) as OcrResponse;

        if (data.IsErroredOnProcessing || !data.ParsedResults || data.ParsedResults.length === 0) {
            console.error("OCR API processing error:", data.ErrorMessage);
            return null;
        }

        return data.ParsedResults[0].ParsedText;
    } catch (error) {
        console.error("Failed to parse text via OCR.space", error);
        return null;
    }
}
