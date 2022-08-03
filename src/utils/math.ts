/**
 * Normalize any degree to 0-360
 * @param heading
 * @returns normalized heading
 */
export const normalizeHeading = (heading: number) => Math.round((heading + 360) % 360)
