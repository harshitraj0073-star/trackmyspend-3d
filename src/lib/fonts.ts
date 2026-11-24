import headingFontUrl from "@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url";
import headingMediumFontUrl from "@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff?url";
import bodyFontUrl from "@fontsource/inter/files/inter-latin-500-normal.woff?url";

/** Self-hosted font files used by in-world 3D text (troika needs woff/ttf). */
export const FONTS = {
  heading: headingFontUrl,
  headingMedium: headingMediumFontUrl,
  body: bodyFontUrl
} as const;
