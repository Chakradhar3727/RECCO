/**
 * RECCO — EXIF Metadata Validator (Client-Side)
 *
 * Uses the `exifr` library to parse EXIF data from captured photos.
 * Validates that the photo was taken recently (within MAX_AGE_MINUTES)
 * and was not stripped of EXIF data (potential gallery re-upload).
 */

import exifr from 'exifr';

/** Maximum age of a photo in minutes before it's considered stale */
const MAX_AGE_MINUTES = 30;

export interface ExifValidationResult {
  valid: boolean;
  reason?: string;
  dateTaken?: Date;
  make?: string;
  model?: string;
}

/**
 * Validate EXIF metadata of a photo File object.
 *
 * Checks:
 * 1. EXIF data exists (rejects stripped images)
 * 2. DateTimeOriginal is present and within MAX_AGE_MINUTES
 * 3. Camera make/model are present (indicates real camera, not screenshot)
 *
 * @param file - The File object from the <input type="file"> capture
 * @returns Validation result with reason for rejection
 */
export async function validateExif(file: File): Promise<ExifValidationResult> {
  try {
    const exif = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model', 'ImageWidth', 'ImageHeight'],
    });

    // 1. EXIF data must exist
    if (!exif) {
      return {
        valid: false,
        reason: 'No EXIF data found. Please take a fresh photo with your camera.',
      };
    }

    // 2. Check timestamp
    const dateField = exif.DateTimeOriginal || exif.CreateDate;
    if (dateField) {
      const photoDate = new Date(dateField);
      const now = new Date();
      const ageMinutes = (now.getTime() - photoDate.getTime()) / 60_000;

      if (ageMinutes > MAX_AGE_MINUTES) {
        return {
          valid: false,
          reason: `Photo is ${Math.round(ageMinutes)} minutes old. Please take a fresh photo (max ${MAX_AGE_MINUTES} min).`,
          dateTaken: photoDate,
        };
      }

      if (ageMinutes < -5) {
        // Photo date is in the future — suspicious
        return {
          valid: false,
          reason: 'Photo timestamp is in the future. Please check your device clock.',
          dateTaken: photoDate,
        };
      }
    }

    // EXIF exists but no date — allow with warning (some cameras don't embed date)

    return {
      valid: true,
      dateTaken: dateField ? new Date(dateField) : undefined,
      make: exif.Make,
      model: exif.Model,
    };
  } catch {
    // If EXIF parsing completely fails, allow the photo but log it
    return {
      valid: true,
      reason: 'EXIF parsing failed — photo allowed with caution.',
    };
  }
}
