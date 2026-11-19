# Export to PDF for ChatGPT — v1.0.0

A local Chrome Manifest V3 extension to export the open ChatGPT conversation through Chrome's **Save as PDF** print dialog.

## Features

- **Code block correctness:** Extract rendered line boundaries from syntax-highlighted code before cloning it. Bash, JSON and multiline code retain real newlines and indentation, even when the original HTML uses individual line wrappers.
- **Citation cleanup:** Remove compact source icon-and-text popover pills (such as `OBS` or `GitHub` citations) as well as explicitly marked citations. Do not click or resolve sources; normal hyperlinks and ordinary text remain intact.
- Existing themes, layout, user message cards, adaptive scrolling, and attachment pills remain unchanged.

## Preserved behavior

- **User messages:** all user text remains, while uploaded images and files are represented only as compact filename/type pills. Detects generic file cards and attachment-only messages, including PDF/ZIP filenames when exposed in the page. If an image has no filename, it appears as `Image attachment`.
- **Assistant responses:** text, tables, code, standard images and SVGs remain as document content. Unsupported visual widgets are converted to static snapshots where browser security permits; HTML fallback is retained if a snapshot fails.
- **Links:** ordinary HTTP(S) links retain their actual destinations. ChatGPT-only download actions are plain-text labels with an explicit note that the original conversation is required; no fake duplicate URLs.
- **Citations:** no source lookups or clicks; badges excluded as before.
- **Themes:** Light (#FFFFFF), Dark (#1F2329), Black (#000000). Print pagination and existing settings retained.

## Install

1. Extract the ZIP.
2. Open `chrome://extensions`, enable **Developer mode**.
3. Remove the previous version; **Load unpacked** and select this folder.
4. Refresh the ChatGPT tab and click the extension icon.
5. Choose **Save as PDF** in Chrome's print dialog.

## Limitations

- The export is limited by ChatGPT's internal DOM, message virtualization, and available attachment metadata.
- Images uploaded by the user are intentionally **not** included as images in the PDF.
- Static snapshots represent only currently rendered widget state. Cross-origin resources, protected images, and some interactive components may fail to rasterize; they fall back to the available HTML/SVG representation.
- Authenticated ChatGPT file downloads cannot be embedded in the PDF; use the original conversation.
- Nothing is uploaded to an external server by this extension.
