import type { ExportSettings, PdfTheme } from './types.js';

export const defaults: ExportSettings = {
  theme: 'light',
  paper: 'A4',
  pageNumbers: true,
  titleAndDate: true,
  userBubbles: true,
  includeProgress: false
};

export interface ThemePalette {
  page: string;
  text: string;
  muted: string;
  border: string;
  user: string;
  userLine: string;
  code: string;
  table: string;
  stripe: string;
  accent: string;
  inline: string;
}

export const palette: Record<PdfTheme, ThemePalette> = {
  light: {
    page: '#ffffff', text: '#202938', muted: '#687386', border: '#d9dfe8',
    user: '#eaf1fb', userLine: '#4279bc', code: '#f5f7fa', table: '#eef1f5', stripe: '#fafbfd',
    accent: '#245eaa', inline: '#f0f2f5'
  },
  dark: {
    page: '#1f2329', text: '#e7ebf1', muted: '#b2bdcb', border: '#4d5561',
    user: '#293745', userLine: '#8abaff', code: '#2a3038', table: '#343d47', stripe: '#282f37',
    accent: '#9dc6ff', inline: '#303944'
  },
  black: {
    page: '#000000', text: '#f1f3f5', muted: '#b2b9c2', border: '#363b43',
    user: '#101b2a', userLine: '#87b6fb', code: '#101317', table: '#22272e', stripe: '#101419',
    accent: '#a9d0ff', inline: '#252b32'
  }
};

export const htmlTags: Set<string> = new Set('P DIV SPAN BR STRONG B EM I U S H1 H2 H3 H4 H5 H6 UL OL LI PRE CODE BLOCKQUOTE TABLE THEAD TBODY TFOOT TR TH TD HR A IMG SUP SUB FIGURE FIGCAPTION DETAILS SUMMARY KBD MARK SMALL DEL INS'.split(' '));
export const svgTags: Set<string> = new Set('SVG G PATH RECT CIRCLE ELLIPSE LINE POLYLINE POLYGON TEXT TSPAN DEFS CLIPPATH LINEARGRADIENT RADIALGRADIENT STOP MARKER TITLE DESC FOREIGNOBJECT SYMBOL USE MASK PATTERN IMAGE FILTER FEGaussianBlur FEMERGE FEMERGENODE FECOLORMATRIX'.toUpperCase().split(' '));
export const htmlAttrs: Record<string, string[]> = {
  A: ['href', 'title'],
  IMG: ['src', 'alt', 'width', 'height'],
  TH: ['colspan', 'rowspan'],
  TD: ['colspan', 'rowspan'],
  OL: ['start']
};
export const svgAttrs: Set<string> = new Set('viewBox preserveAspectRatio x y x1 y1 x2 y2 width height rx ry cx cy r d points transform fill fill-opacity stroke stroke-opacity stroke-width stroke-linecap stroke-linejoin stroke-dasharray vector-effect opacity font-family font-size font-weight text-anchor dominant-baseline offset stop-color stop-opacity clip-path marker-start marker-end id href xmlns xlink:href'.split(' '));
export const ignoredTags: Set<string> = new Set('SCRIPT STYLE BUTTON INPUT TEXTAREA SELECT NOSCRIPT IFRAME VIDEO AUDIO TEMPLATE'.split(' '));

export const fileNameRE: RegExp = /[\p{L}\p{N}_() \[\].+\-]{1,125}\.(?:pdf|zip|png|jpe?g|gif|webp|svg|txt|md|docx?|xlsx?|pptx?|csv|json|log|py|js|tsx?|java|mp4|webm|mov|mp3|wav|jsonl|html|xml|ipynb|odt|ods|rtf|heic|avif)\b/giu;
export const fileExtensionRE: RegExp = /\.(?:pdf|zip|png|jpe?g|gif|webp|svg|txt|md|docx?|xlsx?|pptx?|csv|json|log|py|js|tsx?|java|mp4|webm|mov|mp3|wav|jsonl|html|xml|ipynb|odt|ods|rtf|heic|avif)$/i;
export const fileHintRE: RegExp = /(?:attachment|uploaded[-_ ]?file|file[-_ ]?(?:card|chip|tile|preview|item)|upload[-_ ]?(?:preview|card|file|item)|image[-_ ]?preview|file[-_ ]?upload|attachment[-_ ]?name)/i;
export const fileMetadataAttributes: string[] = [
  'data-filename','data-file-name','data-original-filename','data-original-name',
  'data-attachment-name','data-name','download','title','aria-label','alt'
];
