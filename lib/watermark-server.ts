import sharp from "sharp";
import fs from "fs";
import path from "path";

const CREAM = { r: 244, g: 236, b: 216 };
const BLACK = { r: 0, g: 0, b: 0 };
const WORDMARK_SVG_PATH = path.join(process.cwd(), "public/the-view-logo.svg");
const EYE_PNG_PATH = path.join(process.cwd(), "public/logo.png");

// Tuned interactively against real gallery photos — see conversation history
// for the design pass that landed on these numbers.
const STYLE = {
  widthPct: 0.2, // wordmark width as a fraction of the photo's width
  eyeWidthRatio: 0.42, // eye mark width as a fraction of the wordmark width
  gapRatio: -0.32, // vertical gap between eye and wordmark, as a fraction of wordmark height (negative = overlap)
  shadowBlur: 16,
  shadowOpacity: 0.6,
  markOpacity: 0.92,
  marginPct: 0.025, // margin from the photo edge, as a fraction of photo width
};

function svgWithFill(fillColor: string, opacity: number) {
  const raw = fs.readFileSync(WORDMARK_SVG_PATH, "utf8");
  return raw.replace(/fill="#000000"/, `fill="${fillColor}" fill-opacity="${opacity}"`);
}

// Recolors the eye PNG by keeping its alpha shape and filling with a solid color.
// Used only for the shadow silhouette — the crisp eye mark keeps its real
// two-tone artwork (cream outline + dark pupil), not a recolor.
async function eyeSilhouette(widthPx: number, color: { r: number; g: number; b: number }) {
  const alphaMask = await sharp(EYE_PNG_PATH).resize(widthPx, widthPx).ensureAlpha().extractChannel("alpha").toBuffer();
  const solid = await sharp({ create: { width: widthPx, height: widthPx, channels: 3, background: color } }).png().toBuffer();
  return sharp(solid).joinChannel(alphaMask).png().toBuffer();
}

// Builds the eye-above-wordmark lockup as one transparent PNG, with a single
// unified blurred shadow behind both pieces for legibility on busy photos.
async function makeLockup(wordmarkWidth: number): Promise<Buffer> {
  const wmAspect = 192 / 482;
  const wordmarkHeight = Math.round(wordmarkWidth * wmAspect);
  const eyeWidth = Math.round(wordmarkWidth * STYLE.eyeWidthRatio);
  const gap = Math.round(wordmarkHeight * STYLE.gapRatio);
  const contentWidth = Math.max(wordmarkWidth, eyeWidth);
  const contentHeight = eyeWidth + gap + wordmarkHeight;
  const pad = Math.round(wordmarkWidth * 0.4);

  const wordmarkPng = await sharp(Buffer.from(svgWithFill("#F4ECD8", STYLE.markOpacity))).resize(wordmarkWidth, wordmarkHeight).png().toBuffer();
  const eyePng = await sharp(EYE_PNG_PATH).resize(eyeWidth, eyeWidth).png().toBuffer();

  const wordmarkShadowPng = await sharp(Buffer.from(svgWithFill("#000000", STYLE.shadowOpacity))).resize(wordmarkWidth, wordmarkHeight).png().toBuffer();
  const eyeShadowPng = await eyeSilhouette(eyeWidth, BLACK);

  const canvasW = contentWidth + pad * 2;
  const canvasH = contentHeight + pad * 2;
  const eyeX = pad + Math.round((contentWidth - eyeWidth) / 2);
  const wmX = pad + Math.round((contentWidth - wordmarkWidth) / 2);
  const eyeY = pad;
  const wmY = pad + eyeWidth + gap;

  const shadowLayer = await sharp({ create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: eyeShadowPng, left: eyeX, top: eyeY },
      { input: wordmarkShadowPng, left: wmX, top: wmY },
    ])
    .png()
    .toBuffer();
  const blurredShadow = await sharp(shadowLayer).blur(STYLE.shadowBlur).png().toBuffer();

  const untrimmed = await sharp({ create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: blurredShadow, left: 0, top: 0 },
      { input: eyePng, left: eyeX, top: eyeY },
      { input: wordmarkPng, left: wmX, top: wmY },
    ])
    .png()
    .toBuffer();

  // The canvas has generous padding baked in for the shadow blur to bleed into
  // without clipping — trim it back to the visible pixels so corner placement
  // isn't silently pushed inward by that padding.
  return sharp(untrimmed).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

export async function watermarkPhoto(photoBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(photoBuffer).metadata();
  const width = meta.width!;

  const wordmarkWidth = Math.round(width * STYLE.widthPct);
  const lockup = await makeLockup(wordmarkWidth);
  const lockupMeta = await sharp(lockup).metadata();
  const marginPx = Math.round(width * STYLE.marginPct);

  const left = Math.round((width - lockupMeta.width!) / 2);
  const top = marginPx;

  return sharp(photoBuffer)
    .composite([{ input: lockup, left, top }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
