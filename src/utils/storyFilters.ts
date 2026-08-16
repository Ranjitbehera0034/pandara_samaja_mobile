// Skia ColorMatrix presets for the story camera. Matrices are 4x5 row-major
// arrays operating on unpremultiplied 0-1 RGBA (Skia's native ColorMatrix
// convention, not Android's 0-255 one) — the 5th column of each row is an
// additive offset in that same 0-1 range.

const IDENTITY = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

// Standard luminance-weighted grayscale.
const GRAYSCALE = [
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0, 0, 0, 1, 0,
];

// Classic sepia/vintage matrix.
const VINTAGE = [
  0.393, 0.769, 0.189, 0, 0,
  0.349, 0.686, 0.168, 0, 0,
  0.272, 0.534, 0.131, 0, 0,
  0, 0, 0, 1, 0,
];

// Slight orange/red push, blue pulled back.
const WARM = [
  1.1, 0, 0, 0, 0.03,
  0, 1.0, 0, 0, 0.01,
  0, 0, 0.85, 0, 0,
  0, 0, 0, 1, 0,
];

// Slight blue push, red/green pulled back.
const COOL = [
  0.9, 0, 0, 0, 0,
  0, 1.0, 0, 0, 0,
  0, 0, 1.15, 0, 0.03,
  0, 0, 0, 1, 0,
];

// Luminance-preserving saturation boost (s = 1.4).
const VIVID = [
  1.315, -0.2861, -0.0289, 0, 0,
  -0.085, 1.1139, -0.0289, 0, 0,
  -0.085, -0.2861, 1.3711, 0, 0,
  0, 0, 0, 1, 0,
];

export interface StoryFilter {
  id: string;
  labelKey: string;
  matrix: number[];
}

export const STORY_FILTERS: StoryFilter[] = [
  { id: 'normal', labelKey: 'filterNormal', matrix: IDENTITY },
  { id: 'bw', labelKey: 'filterBw', matrix: GRAYSCALE },
  { id: 'vintage', labelKey: 'filterVintage', matrix: VINTAGE },
  { id: 'warm', labelKey: 'filterWarm', matrix: WARM },
  { id: 'cool', labelKey: 'filterCool', matrix: COOL },
  { id: 'vivid', labelKey: 'filterVivid', matrix: VIVID },
];
