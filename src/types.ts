export type PdfTheme = 'light' | 'dark' | 'black';
export type PaperFormat = 'A4' | 'Letter';
export type ConversationRole = 'user' | 'assistant';

export interface ExportSettings {
  theme: PdfTheme;
  paper: PaperFormat;
  pageNumbers: boolean;
  titleAndDate: boolean;
  userBubbles: boolean;
  includeProgress: boolean;
}

export interface ProgressController {
  update: (scanned: number, total?: number | string) => void;
  finish: () => void;
  abort: () => void;
  isAborted: () => boolean;
}

export interface SnapshotManager {
  register: (element: Element) => Promise<void>;
  get: (element: Element) => string | undefined;
  has: (element: Element) => boolean;
  cache: Map<Element, string>;
}

export interface DomCleanerOptions {
  doc: Document;
  snapshotCache: {
    get: (element: Element) => string | undefined;
    has: (element: Element) => boolean;
  };
  userAttachmentNodes: Set<Element>;
}

export interface DomCleaner {
  clean: (node: Node, inVisualLayout?: boolean, role?: ConversationRole) => Node;
  cleanTurn: (turn: Element, role?: ConversationRole) => HTMLElement | DocumentFragment;
}

export interface ScanStats {
  seenTurns: Set<string>;
  totalTurns: number;
}
