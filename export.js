(() => {
  // src/config.js
  var defaults = {
    theme: "light",
    paper: "A4",
    pageNumbers: true,
    titleAndDate: true,
    userBubbles: true,
    includeProgress: false
  };
  var palette = {
    light: {
      page: "#ffffff",
      text: "#202938",
      muted: "#687386",
      border: "#d9dfe8",
      user: "#eaf1fb",
      userLine: "#4279bc",
      code: "#f5f7fa",
      table: "#eef1f5",
      stripe: "#fafbfd",
      accent: "#245eaa",
      inline: "#f0f2f5"
    },
    dark: {
      page: "#1f2329",
      text: "#e7ebf1",
      muted: "#b2bdcb",
      border: "#4d5561",
      user: "#293745",
      userLine: "#8abaff",
      code: "#2a3038",
      table: "#343d47",
      stripe: "#282f37",
      accent: "#9dc6ff",
      inline: "#303944"
    },
    black: {
      page: "#000000",
      text: "#f1f3f5",
      muted: "#b2b9c2",
      border: "#363b43",
      user: "#101b2a",
      userLine: "#87b6fb",
      code: "#101317",
      table: "#22272e",
      stripe: "#101419",
      accent: "#a9d0ff",
      inline: "#252b32"
    }
  };
  var htmlTags = new Set("P DIV SPAN BR STRONG B EM I U S H1 H2 H3 H4 H5 H6 UL OL LI PRE CODE BLOCKQUOTE TABLE THEAD TBODY TFOOT TR TH TD HR A IMG SUP SUB FIGURE FIGCAPTION DETAILS SUMMARY KBD MARK SMALL DEL INS".split(" "));
  var svgTags = new Set("SVG G PATH RECT CIRCLE ELLIPSE LINE POLYLINE POLYGON TEXT TSPAN DEFS CLIPPATH LINEARGRADIENT RADIALGRADIENT STOP MARKER TITLE DESC FOREIGNOBJECT SYMBOL USE MASK PATTERN IMAGE FILTER FEGaussianBlur FEMERGE FEMERGENODE FECOLORMATRIX".toUpperCase().split(" "));
  var htmlAttrs = {
    A: ["href", "title"],
    IMG: ["src", "alt", "width", "height"],
    TH: ["colspan", "rowspan"],
    TD: ["colspan", "rowspan"],
    OL: ["start"]
  };
  var svgAttrs = new Set("viewBox preserveAspectRatio x y x1 y1 x2 y2 width height rx ry cx cy r d points transform fill fill-opacity stroke stroke-opacity stroke-width stroke-linecap stroke-linejoin stroke-dasharray vector-effect opacity font-family font-size font-weight text-anchor dominant-baseline offset stop-color stop-opacity clip-path marker-start marker-end id href xmlns xlink:href".split(" "));
  var ignoredTags = new Set("SCRIPT STYLE BUTTON INPUT TEXTAREA SELECT NOSCRIPT IFRAME VIDEO AUDIO TEMPLATE".split(" "));
  var fileNameRE = /[\p{L}\p{N}_() \[\].+\-]{1,125}\.(?:pdf|zip|png|jpe?g|gif|webp|svg|txt|md|docx?|xlsx?|pptx?|csv|json|log|py|js|tsx?|java|mp4|webm|mov|mp3|wav|jsonl|html|xml|ipynb|odt|ods|rtf|heic|avif)\b/giu;
  var fileExtensionRE = /\.(?:pdf|zip|png|jpe?g|gif|webp|svg|txt|md|docx?|xlsx?|pptx?|csv|json|log|py|js|tsx?|java|mp4|webm|mov|mp3|wav|jsonl|html|xml|ipynb|odt|ods|rtf|heic|avif)$/i;
  var fileHintRE = /(?:attachment|uploaded[-_ ]?file|file[-_ ]?(?:card|chip|tile|preview|item)|upload[-_ ]?(?:preview|card|file|item)|image[-_ ]?preview|file[-_ ]?upload|attachment[-_ ]?name)/i;
  var fileMetadataAttributes = [
    "data-filename",
    "data-file-name",
    "data-original-filename",
    "data-original-name",
    "data-attachment-name",
    "data-name",
    "download",
    "title",
    "aria-label",
    "alt"
  ];

  // src/ui/progress.js
  function createProgressIndicator() {
    const progressHost = document.createElement("div");
    progressHost.id = "chatpdf-export-progress";
    progressHost.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:2147483647;width:300px;max-width:calc(100vw - 36px);font-family:Arial,Helvetica,sans-serif;";
    const progressShadow = progressHost.attachShadow({ mode: "closed" });
    progressShadow.innerHTML = `<style>
    *{box-sizing:border-box}
    .panel{background:#20242b;color:#f7f8fa;padding:15px 16px 12px;border:1px solid #50596a;
      border-radius:12px;box-shadow:0 8px 26px #0007;font:13px/1.4 Arial,sans-serif}
    .top{display:flex;align-items:center;justify-content:space-between;gap:9px}
    .title{font-weight:700;font-size:13px}.stage{margin:9px 0 6px;color:#cbd5e1;font-size:12px}
    .track{height:5px;background:#4b5563;border-radius:5px;overflow:hidden}
    .bar{height:100%;width:0%;background:#93c5fd;transition:width .22s ease}
    .info{font-size:11px;color:#cbd5e1;margin-top:9px}
    button{border:1px solid #718096;color:#f8fafc;border-radius:6px;background:#313c49;
      padding:5px 9px;cursor:pointer;font:11px Arial,sans-serif}
    button:hover{background:#4d5d6f}
  </style><div class="panel" role="status" aria-live="polite">
    <div class="top"><span class="title">Exporting ChatGPT conversation</span>
      <button type="button" id="cancel">Cancel</button></div>
    <div class="stage" id="stage">Preparing conversation scan\u2026</div>
    <div class="track"><div class="bar" id="bar"></div></div>
    <div class="info" id="info">Checking loaded messages</div>
  </div>`;
    document.body.appendChild(progressHost);
    const progressStage = progressShadow.getElementById("stage");
    const progressBar = progressShadow.getElementById("bar");
    const progressInfo = progressShadow.getElementById("info");
    let scanCancelled = false;
    progressShadow.getElementById("cancel").addEventListener("click", () => {
      scanCancelled = true;
      progressStage.textContent = "Cancelling export\u2026";
    });
    function checkCancelled() {
      if (scanCancelled) throw new Error("Export cancelled.");
    }
    function showProgress(label, fraction, description) {
      if (progressHost && progressHost.isConnected) {
        progressStage.textContent = label;
        progressBar.style.width = `${Math.max(0, Math.min(100, Math.round(fraction * 100)))}%`;
        if (description) progressInfo.textContent = description;
      }
    }
    function remove() {
      progressHost?.remove();
    }
    return {
      progressHost,
      showProgress,
      checkCancelled,
      remove
    };
  }

  // src/utils.js
  var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  var afterPaint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  function safeURL(value, allowImageData = false) {
    if (!value) return null;
    if (allowImageData && /^data:image\/(?:png|jpeg|gif|webp|svg\+xml);/i.test(value)) return value;
    try {
      const url = new URL(value, location.href);
      if (allowImageData && url.protocol === "blob:" && url.origin === location.origin) return url.href;
      return ["https:", "http:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }
  function quotedCSS(value) {
    return '"' + String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]/g, " ").slice(0, 120) + '"';
  }

  // src/capture/snapshot.js
  function createSnapshotManager({
    scrollHost,
    getProgressHost,
    checkCancelled,
    waitForSettled,
    scanStats
  }) {
    const snapshotCache = /* @__PURE__ */ new WeakMap();
    const pendingVisuals = /* @__PURE__ */ new Set();
    let lastCaptureAt = 0;
    let snapshotCount = 0;
    function colorfulDescendant(element) {
      const descendants = [element, ...Array.from(element.querySelectorAll("*")).slice(0, 36)];
      return descendants.some((child) => {
        if (child.tagName === "IMG" || child.tagName === "CANVAS" || child.tagName === "SVG") return true;
        const r = child.getBoundingClientRect();
        if (r.width < 12 || r.height < 8) return false;
        const st = getComputedStyle(child);
        const parentBg = child.parentElement ? getComputedStyle(child.parentElement).backgroundColor : "";
        return st.backgroundImage !== "none" || st.backgroundColor !== "rgba(0, 0, 0, 0)" && st.backgroundColor !== "transparent" && st.backgroundColor !== parentBg;
      });
    }
    function isSnapshotCandidate(element, root) {
      if (element === root || !["DIV", "SECTION", "FIGURE"].includes(element.tagName)) return false;
      if (element.closest(".group\\/user-message, .turn-action-controls")) return false;
      if (element.querySelector("table, pre, textarea, input")) return false;
      if (element.querySelector("img, svg") && !element.querySelector("canvas")) return false;
      const r = element.getBoundingClientRect();
      if (r.width < 70 || r.height < 35 || r.width > 1300 || r.height > 950) return false;
      if ((element.innerText || "").length > 1700) return false;
      const hint = [
        element.className,
        element.getAttribute("data-testid"),
        element.getAttribute("role"),
        element.getAttribute("aria-label")
      ].filter((v) => typeof v === "string").join(" ");
      const specialized = /(?:chart|plot|graph|diagram|visuali[sz]|recharts|highcharts|plotly|echarts|map-widget|flowchart|app-block|static-visual|custom-widget)/i.test(hint);
      const style = getComputedStyle(element);
      const children = Array.from(element.children);
      const gallery = children.length >= 2 && children.length <= 5 && (style.display.includes("grid") || style.display.includes("flex") && style.flexDirection === "row") && children.filter((child) => colorfulDescendant(child)).length >= 2 && r.height < 480 && (element.innerText || "").length < 480;
      return specialized && colorfulDescendant(element) || gallery;
    }
    async function snapshotElement(element) {
      const viewportW = document.documentElement.clientWidth;
      const viewportH = window.innerHeight;
      const hostRect = scrollHost.getBoundingClientRect();
      const previousTop = scrollHost.scrollTop;
      let rect = element.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10 || rect.width * rect.height > 85e4 || rect.height > hostRect.height - 8 || !chrome.runtime?.sendMessage) return null;
      const progressHost = getProgressHost?.();
      try {
        if (rect.top < hostRect.top + 2 || rect.bottom > hostRect.bottom - 2) {
          scrollHost.scrollTop += rect.top - hostRect.top - (hostRect.height - rect.height) / 2;
          await waitForSettled({ minimum: 400, maximum: 1800 });
          rect = element.getBoundingClientRect();
        }
        if (!element.isConnected || rect.left < 0 || rect.top < hostRect.top - 2 || rect.right > viewportW || rect.bottom > hostRect.bottom + 2 || rect.bottom > viewportH) return null;
        if (progressHost) progressHost.style.visibility = "hidden";
        await afterPaint();
        const remaining = Math.max(0, 650 - (performance.now() - lastCaptureAt));
        if (remaining) await sleep(remaining);
        checkCancelled();
        lastCaptureAt = performance.now();
        const response = await chrome.runtime.sendMessage({ type: "CHAT_PDF_CAPTURE_WIDGET" });
        if (!response?.dataUrl) return null;
        const screenshot = new Image();
        await new Promise((resolve, reject) => {
          screenshot.onload = resolve;
          screenshot.onerror = reject;
          screenshot.src = response.dataUrl;
        });
        const scaleX = screenshot.naturalWidth / window.innerWidth;
        const scaleY = screenshot.naturalHeight / window.innerHeight;
        const crop = document.createElement("canvas");
        crop.width = Math.max(1, Math.round(rect.width * scaleX));
        crop.height = Math.max(1, Math.round(rect.height * scaleY));
        const ctx = crop.getContext("2d");
        ctx.drawImage(
          screenshot,
          Math.round(rect.x * scaleX),
          Math.round(rect.y * scaleY),
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height
        );
        return crop.toDataURL("image/png");
      } catch (error) {
        console.debug("ChatGPT PDF: static widget capture unavailable; preserving HTML.", error);
        return null;
      } finally {
        scrollHost.scrollTop = previousTop;
        if (progressHost) progressHost.style.visibility = "visible";
      }
    }
    async function prepareVisualSnapshots(root) {
      const all = [...root.querySelectorAll("div,section,figure")];
      const selected = [];
      for (const element of all) {
        if (!isSnapshotCandidate(element, root) || selected.some((parent) => parent.contains(element))) continue;
        selected.push(element);
        if (selected.length >= 12) break;
      }
      for (let index = 0; index < selected.length; index++) {
        const element = selected[index];
        if (snapshotCache.has(element)) continue;
        checkCancelled();
        const turnKey = element.closest("[data-turn-key]")?.getAttribute("data-turn-key") || "unknown";
        const visualKey = `${turnKey}:${index}:${(element.textContent || "").slice(0, 90)}`;
        scanStats.visualCandidates++;
        if (snapshotCount >= 90) {
          pendingVisuals.add(visualKey);
          continue;
        }
        const image = await snapshotElement(element);
        if (image) {
          snapshotCache.set(element, image);
          snapshotCount++;
          scanStats.visualSnapshots++;
          pendingVisuals.delete(visualKey);
        } else {
          pendingVisuals.add(visualKey);
        }
      }
    }
    return {
      snapshotCache,
      pendingVisuals,
      getSnapshotCount: () => snapshotCount,
      prepareVisualSnapshots
    };
  }

  // src/dom/citations.js
  function isCitationBadge(node, role) {
    if (role !== "assistant" || !(node instanceof Element)) return false;
    const tag = node.tagName.toUpperCase();
    if (!["DIV", "SPAN", "A", "BUTTON", "SUP"].includes(tag)) return false;
    const label = (node.textContent || "").replace(/\s+/g, " ").trim();
    if (label.length > 125) return false;
    if (node.querySelector("p,h1,h2,h3,h4,h5,h6,table,ul,ol,pre,figure,blockquote")) return false;
    const rect = node.getBoundingClientRect();
    if (rect.width && rect.width > 350 || rect.height && rect.height > 70) return false;
    const hint = [
      node.className,
      node.getAttribute("data-testid"),
      node.getAttribute("data-citation-id"),
      node.getAttribute("data-source-id"),
      node.getAttribute("aria-label"),
      node.getAttribute("data-popover-trigger")
    ].filter((value) => typeof value === "string").join(" ");
    const namedCitation = /(?:citation|cite[-_ ]|source[-_ ]?(?:pill|badge|link|reference|chip|popover)|web[-_ ]?source|footnote[-_ ]?(?:link|badge))/i.test(hint);
    if (namedCitation) return true;
    if (!label || label.length > 60 || label.includes("\n")) return false;
    if (node.matches("a[href]") && safeURL(node.getAttribute("href"))) return false;
    if (node.querySelector('a[href^="http:"] , a[href^="https:"]')) return false;
    const icons = [...node.querySelectorAll("img,svg")];
    if (icons.length < 1 || icons.length > 3) return false;
    if (icons.some((icon) => {
      const r = icon.getBoundingClientRect();
      return r.width > 30 || r.height > 30;
    })) return false;
    const style = getComputedStyle(node);
    const parentStyle = node.parentElement ? getComputedStyle(node.parentElement) : null;
    const background = style.backgroundColor;
    const hasBadgeBackground = background && background !== "transparent" && background !== "rgba(0, 0, 0, 0)" && (!parentStyle || background !== parentStyle.backgroundColor);
    const hasRoundedShape = (parseFloat(style.borderTopLeftRadius) || 0) >= 5;
    const classIsPill = /(?:rounded-full|rounded-md|rounded-lg|badge|pill|chip)/i.test(hint);
    const looksLikePill = hasRoundedShape && hasBadgeBackground || classIsPill;
    const interactive = node.matches('[role="button"],[aria-haspopup],[data-state],button,[tabindex]') || !!node.querySelector('[role="button"],[aria-haspopup],[data-state],button');
    const parent = node.parentElement;
    const sibling = node.previousElementSibling || parent?.previousElementSibling;
    const nextToProse = !!node.closest("p") || !!sibling && (sibling.matches("p") || (sibling.textContent || "").trim().length > 55) || parent?.tagName === "P";
    return !!(looksLikePill && (interactive || nextToProse) || interactive && nextToProse && label.length <= 35 && rect.height <= 32);
  }

  // src/dom/code.js
  function shouldPreserveLines(source, tag) {
    if (!["DIV", "P", "SPAN", "CODE", "KBD"].includes(tag) || !/[\r\n]/.test(source.textContent || "")) return false;
    const whiteSpace = getComputedStyle(source).whiteSpace;
    if (["pre", "pre-wrap", "pre-line", "break-spaces"].includes(whiteSpace)) return true;
    return source.children.length === 0 && (source.textContent || "").split(/\r?\n/).filter((line) => line.trim()).length > 1;
  }
  function extractCodeText(pre) {
    const code = pre.querySelector("code") || pre;
    const normalize = (value) => String(value || "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
    const raw = normalize(code.textContent);
    const rendered = normalize(code.innerText || pre.innerText);
    const count = (value) => (value.match(/\n/g) || []).length;
    if (count(raw) >= count(rendered) && count(raw) > 0) return raw;
    if (count(rendered) > 0) return rendered;
    const children = [...code.children].filter((child) => !child.matches('button,[aria-hidden="true"],[class*="line-number"]'));
    const lineLike = children.length >= 2 && children.every((child) => child.matches('[data-line],[data-code-line],.line,.code-line,[class*="token-line"]') || ["DIV", "P"].includes(child.tagName) || ["block", "list-item"].includes(getComputedStyle(child).display));
    if (lineLike) return children.map((child) => normalize(child.textContent)).join("\n");
    return raw || rendered;
  }

  // src/dom/visual.js
  function isDownloadLabel(text) {
    const label = (text || "").trim();
    if (/\b(?:chrome|edge|brave|about|moz-extension):\/\//i.test(label)) return false;
    return /^(?:⬇\s*)?(?:download|open|view)\s+.{1,90}(?:\.(?:pdf|zip|png|jpg|jpeg|docx?|xlsx?|pptx?)\b|\((?:zip|pdf)\)|file\b)/i.test(label) || /^download\s+.{1,100}(?:extension|zip|pdf)/i.test(label);
  }
  function markChatOnlyLink(target) {
    target.classList.add("chat-only-download");
    target.removeAttribute("href");
    target.setAttribute("title", "Available in the original ChatGPT conversation");
  }
  function copyMediaDimensions(node, out, tag) {
    const rect = node.getBoundingClientRect();
    const width = rect.width || Number(node.getAttribute("width")) || 0;
    const height = rect.height || Number(node.getAttribute("height")) || 0;
    if (width > 2 && height > 2) {
      const max = /(?:logo|icon|avatar|favicon)/i.test(node.getAttribute("alt") || "") ? 210 : 760;
      out.style.maxWidth = "100%";
      out.style.width = `${Math.min(Math.round(width), max)}px`;
      if (tag === "IMG") out.style.height = "auto";
    }
    if (tag === "IMG") out.classList.add("export-image");
  }
  function addVisualLayout(node, out) {
    const children = Array.from(node.children);
    if (children.length < 2 || children.length > 8) return;
    const visualChildren = children.filter((child) => child.querySelector("img, svg, canvas") || ["IMG", "SVG", "CANVAS"].includes(child.tagName) || child.getBoundingClientRect().height > 8 && getComputedStyle(child).backgroundColor !== "rgba(0, 0, 0, 0)");
    if (visualChildren.length < 2) return;
    const style = getComputedStyle(node);
    if (style.display.includes("grid")) {
      const count = Math.min(3, Math.max(2, style.gridTemplateColumns.split(/\s+/).length));
      out.classList.add("export-visual-grid");
      out.style.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;
    } else if (style.display.includes("flex") && style.flexDirection === "row") {
      out.classList.add("export-visual-row");
    }
  }
  function hasVisualBox(node) {
    const rect = node.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 5 || rect.height > 160) return false;
    const style = getComputedStyle(node);
    return !!style.backgroundColor && !["transparent", "rgba(0, 0, 0, 0)"].includes(style.backgroundColor) && style.backgroundColor !== getComputedStyle(node.parentElement || node).backgroundColor;
  }
  function preserveVisualBox(node, out) {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    out.classList.add("export-color-block");
    out.style.backgroundColor = style.backgroundColor;
    out.style.borderRadius = Math.min(parseFloat(style.borderRadius) || 0, 16) + "px";
    out.style.minHeight = Math.min(rect.height, 100) + "px";
  }
  function normalizeTableHeader(table, doc = table.ownerDocument) {
    if (table.querySelector("thead")) return;
    const first = table.querySelector("tr");
    if (!first || !first.querySelector("th")) return;
    const thead = doc.createElement("thead");
    thead.appendChild(first);
    table.insertBefore(thead, table.firstChild);
  }

  // src/dom/cleaner.js
  function createDomCleaner({ doc, snapshotCache, userAttachmentNodes }) {
    function clean(node, inVisualLayout = false, role = "assistant") {
      if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent || "");
      if (node.nodeType !== Node.ELEMENT_NODE) return doc.createDocumentFragment();
      if (role === "user" && (node.tagName === "IMG" || userAttachmentNodes.has(node))) return doc.createDocumentFragment();
      if (role === "assistant" && snapshotCache.has(node)) {
        const image = doc.createElement("img");
        image.className = "component-snapshot";
        image.src = snapshotCache.get(node);
        image.alt = node.getAttribute("aria-label") || "Static view of conversation visualization";
        copyMediaDimensions(node, image, "IMG");
        return image;
      }
      if (isCitationBadge(node, role)) return doc.createDocumentFragment();
      const tag = node.tagName.toUpperCase();
      if (tag === "PRE") {
        const pre = doc.createElement("pre");
        const code = doc.createElement("code");
        code.textContent = extractCodeText(node);
        pre.appendChild(code);
        return pre;
      }
      if (ignoredTags.has(tag) && !(tag === "BUTTON" && isDownloadLabel(node.textContent)) || node.hidden || node.getAttribute("aria-hidden") === "true" || node.getAttribute("data-markdown-copy") === "exclude" || node.classList.contains("turn-action-controls")) {
        return doc.createDocumentFragment();
      }
      if (tag === "CANVAS") {
        try {
          const image = doc.createElement("img");
          image.src = node.toDataURL("image/png");
          image.alt = node.getAttribute("aria-label") || "Conversation illustration";
          copyMediaDimensions(node, image, "IMG");
          return image;
        } catch {
          return doc.createDocumentFragment();
        }
      }
      if (["DIV", "SPAN"].includes(tag) && !node.children.length && !node.textContent?.trim()) {
        const bg = getComputedStyle(node).backgroundImage || "";
        const match = /^url\(["']?(.*?)["']?\)$/.exec(bg);
        if (match) {
          const url = safeURL(match[1], true);
          if (url) {
            const img = doc.createElement("img");
            img.src = url;
            img.alt = node.getAttribute("aria-label") || "Conversation image";
            copyMediaDimensions(node, img, "IMG");
            return img;
          }
        }
      }
      const isSVG = svgTags.has(tag);
      const svgCase = { CLIPPATH: "clipPath", LINEARGRADIENT: "linearGradient", RADIALGRADIENT: "radialGradient", FOREIGNOBJECT: "foreignObject" };
      const out = isSVG ? doc.createElementNS("http://www.w3.org/2000/svg", node.localName || svgCase[tag] || tag.toLowerCase()) : doc.createElement(htmlTags.has(tag) ? tag.toLowerCase() : "div");
      if (isSVG) {
        for (const attribute of node.attributes) {
          if (!svgAttrs.has(attribute.name)) continue;
          if (/url\(/i.test(attribute.value) && !/^url\(#[A-Za-z0-9_-]+\)$/.test(attribute.value)) continue;
          if (attribute.name === "href" || attribute.name === "xlink:href") {
            if (attribute.value.startsWith("#")) out.setAttribute(attribute.name, attribute.value);
            else {
              const u = safeURL(attribute.value, true);
              if (u) out.setAttribute(attribute.name, u);
            }
          } else out.setAttribute(attribute.name, attribute.value);
        }
      } else {
        for (const attr of htmlAttrs[tag] || []) {
          const value = tag === "IMG" && attr === "src" ? node.currentSrc || node.getAttribute(attr) : node.getAttribute(attr);
          if (!value) continue;
          if (attr === "href" || attr === "src") {
            const url = safeURL(value, attr === "src");
            if (url) out.setAttribute(attr, url);
            else if (attr === "href" && isDownloadLabel(node.textContent)) markChatOnlyLink(out);
          } else {
            out.setAttribute(attr, value);
          }
        }
      }
      if (!isSVG && shouldPreserveLines(node, tag)) out.classList.add("preserve-lines");
      if (tag === "IMG" || tag === "SVG") copyMediaDimensions(node, out, tag);
      if (!isSVG) addVisualLayout(node, out);
      const visualMode = inVisualLayout || out.classList.contains("export-visual-grid") || out.classList.contains("export-visual-row");
      for (const child of node.childNodes) out.appendChild(clean(child, visualMode, role));
      if (tag === "A" && !out.hasAttribute("href") && isDownloadLabel(node.textContent)) {
        const label = doc.createElement("span");
        label.className = "chat-only-download";
        while (out.firstChild) label.appendChild(out.firstChild);
        return label;
      }
      if (!isSVG && tag !== "A" && node.getAttribute("role") === "link") {
        const u = safeURL(node.getAttribute("data-href") || node.getAttribute("href"));
        if (u) {
          const link = doc.createElement("a");
          link.href = u;
          while (out.firstChild) link.appendChild(out.firstChild);
          out.appendChild(link);
        }
      }
      if (tag === "BUTTON" && isDownloadLabel(node.textContent)) {
        const label = doc.createElement("span");
        label.textContent = node.textContent.trim();
        label.classList.add("chat-only-download");
        return label;
      }
      if (tag === "TABLE") normalizeTableHeader(out, doc);
      if (["P", "DIV", "SPAN"].includes(tag) && !out.textContent.trim() && !out.querySelector("img, svg, table, pre, blockquote, hr, figure, br, .export-color-block, .export-visual-grid, .export-visual-row")) {
        if (visualMode && hasVisualBox(node)) {
          preserveVisualBox(node, out);
          return out;
        }
        return doc.createDocumentFragment();
      }
      if (tag === "P" && !out.querySelector("a") && isDownloadLabel(node.textContent) && (node.textContent || "").trim().length < 100) {
        out.classList.add("chat-only-download");
      }
      return out;
    }
    return clean;
  }

  // src/dom/attachments.js
  function hasContent(element) {
    return !!element && (!!element.innerText?.trim() || !!element.querySelector("img, svg, canvas, pre"));
  }
  function attachmentPill(doc, label, type) {
    const chip = doc.createElement("span");
    chip.className = "attachment-pill";
    const kind = doc.createElement("span");
    kind.className = "attachment-type";
    kind.textContent = type;
    const name = doc.createElement("span");
    name.textContent = label;
    chip.append(kind, name);
    return chip;
  }
  function hintString(element) {
    return [
      element.className,
      element.getAttribute("data-testid"),
      element.getAttribute("data-type"),
      element.getAttribute("data-kind"),
      element.getAttribute("data-component"),
      element.getAttribute("role")
    ].filter((v) => typeof v === "string").join(" ");
  }
  function isUserAttachmentShell(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (element.classList.contains("bg-user-message") || element.matches(".group\\/user-message")) return false;
    return fileHintRE.test(hintString(element)) && ((element.innerText || "").length < 360 || !!element.querySelector("img"));
  }
  function extractNames(value) {
    if (!value || typeof value !== "string") return [];
    const matches = [];
    const lines = value.split(/[\r\n]+/).map((v) => v.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.length > 220) continue;
      const pieces = line.match(fileNameRE) || [];
      for (let piece of pieces) {
        piece = piece.trim().replace(/^(?:(?:OPEN|DOWNLOAD|VIEW)\s+(?:FILE\s+)?|(?:PDF|FILE|IMAGE|ZIP|DOCX?|PNG|JPG)\s+)+/i, "").trim();
        if (fileExtensionRE.test(piece)) matches.push(piece);
      }
    }
    return matches;
  }
  function extractAttachments(doc, turn, user, source, assistantSources, userAttachmentNodes) {
    const wrapper = doc.createElement("div");
    wrapper.className = "message-attachments";
    if (!turn || !user) return wrapper;
    const firstAssistant = assistantSources[0] || null;
    const seenNames = /* @__PURE__ */ new Set();
    const seenOrigins = /* @__PURE__ */ new Set();
    let unnamedImages = 0, unnamedFiles = 0;
    const records = [];
    const roots = [];
    const before = (a, b) => !!a && !!b && a !== b && !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const inUserArea = (el) => {
      if (!turn.contains(el) || el.closest('.turn-action-controls,[data-markdown-copy="exclude"]')) return false;
      if (assistantSources.some((a) => a === el || a.contains(el))) return false;
      if (firstAssistant && !before(el, firstAssistant)) return false;
      return user.contains(el) || el === user || before(user, el);
    };
    const isProse = (el) => !!el.closest("p, pre, code, blockquote, h1, h2, h3, h4, h5, h6, li, table, .markdown");
    function cardRoot(el) {
      let cursor = el, depth = 0, best = null;
      while (cursor && cursor !== turn && depth++ < 8) {
        if (!inUserArea(cursor) || cursor === source || cursor === user) break;
        if ((cursor.innerText || "").length > 450) break;
        if (isUserAttachmentShell(cursor)) best = cursor;
        if (cursor.matches('button,a,[role="button"],[role="link"]')) best = best || cursor;
        if (!best && cursor.querySelector("svg,img") && (cursor.innerText || "").length < 230 && fileHintRE.test(hintString(cursor))) best = cursor;
        cursor = cursor.parentElement;
      }
      return best;
    }
    function metadataNames(el) {
      const found = [];
      for (const attr of fileMetadataAttributes) found.push(...extractNames(el.getAttribute(attr)));
      return found;
    }
    function makeRecord(origin, names, type) {
      if (seenOrigins.has(origin)) return;
      seenOrigins.add(origin);
      if (names.length) {
        for (const name of names) {
          const key = name.toLocaleLowerCase();
          if (seenNames.has(key)) continue;
          seenNames.add(key);
          records.push({ name, type: name.split(".").pop().toUpperCase(), origin });
        }
      } else {
        const label = type === "IMG" ? unnamedImages++ === 0 ? "Image attachment" : `Image attachment ${unnamedImages}` : unnamedFiles++ === 0 ? `${type === "FILE" ? "File" : type} attachment` : `File attachment ${unnamedFiles}`;
        records.push({ name: label, type, origin });
      }
      if (origin !== source && origin !== user && source?.contains(origin)) userAttachmentNodes.add(origin);
      roots.push(origin);
    }
    const all = [...turn.querySelectorAll("*")].filter(inUserArea);
    for (const el of all) {
      if (roots.some((root2) => root2 === el || root2.contains(el))) continue;
      const externalLink = el.closest('a[href^="http:"] , a[href^="https:"]');
      if (externalLink && !isUserAttachmentShell(externalLink) && !externalLink.closest('[data-testid*="upload"],[data-testid*="attachment"]')) continue;
      const hinted = isUserAttachmentShell(el);
      const attributes = metadataNames(el);
      const leafNames = !el.children.length || el.matches('button,a,[role="button"],[role="link"]') ? extractNames((el.innerText || "").slice(0, 220)) : [];
      const names = [.../* @__PURE__ */ new Set([...attributes, ...leafNames])];
      const root = cardRoot(el) || (hinted ? el : null);
      if (root && (names.length || hinted)) {
        const directNames = metadataNames(root);
        const fullNames = [...new Set(directNames.length ? directNames : [...names, ...extractNames((root.innerText || "").slice(0, 250))])];
        const icon = root.querySelector("img,svg,canvas");
        const type = fullNames.length ? "FILE" : /\bpdf\b/i.test(root.innerText || "") ? "PDF" : /\bzip\b/i.test(root.innerText || "") ? "ZIP" : /image|thumbnail|photo/i.test(hintString(root)) || !!root.querySelector("img") ? "IMG" : icon ? "FILE" : "FILE";
        makeRecord(root, fullNames, type);
        continue;
      }
      if (names.length && !isProse(el)) {
        let cur = el.parentElement, found = null;
        for (let depth = 0; cur && depth < 5 && cur !== user && cur !== turn; depth++, cur = cur.parentElement) {
          if (!inUserArea(cur) || cur === source || (cur.innerText || "").length > 240) break;
          const st = getComputedStyle(cur);
          const fileLabel = /\b(?:PDF|ZIP|DOCX?|PNG|JPG|FILE|CSV)\b/i.test(cur.innerText || "");
          const icon = cur.querySelector('svg,[data-testid*="icon"],img');
          const cardVisual = st.cursor === "pointer" || st.borderStyle !== "none" || st.backgroundColor !== "rgba(0, 0, 0, 0)" && st.backgroundColor !== getComputedStyle(cur.parentElement).backgroundColor;
          if (fileLabel && icon || icon && cardVisual || cur.matches('button,a,[role="button"],[role="link"]')) {
            found = cur;
            break;
          }
        }
        if (found) makeRecord(found, names, "FILE");
      }
    }
    for (const img of all.filter((el) => el.tagName === "IMG")) {
      if (roots.some((root2) => root2 === img || root2.contains(img))) continue;
      if (isProse(img)) continue;
      const r = img.getBoundingClientRect();
      if (Math.max(r.width, img.naturalWidth) < 52 || Math.max(r.height, img.naturalHeight) < 40) continue;
      const root = cardRoot(img) || img;
      const names = [...metadataNames(root), ...metadataNames(img)];
      makeRecord(root, names, "IMG");
    }
    for (const rec of records) wrapper.appendChild(attachmentPill(doc, rec.name, rec.type));
    return wrapper;
  }

  // src/scanner/scroller.js
  function createConversationScanner({
    scrollHost,
    scanStats,
    checkCancelled,
    showProgress,
    scanSummary,
    collectVisibleMessages,
    pendingVisuals
  }) {
    function viewportSignature() {
      const hostRect = scrollHost.getBoundingClientRect();
      const visible = [];
      let pendingImages = 0;
      for (const turn of scrollHost.querySelectorAll("[data-turn-key]")) {
        const r = turn.getBoundingClientRect();
        if (r.bottom < hostRect.top - 2 || r.top > hostRect.bottom + 2) continue;
        const key = turn.getAttribute("data-turn-key") || "";
        const turnText = turn.textContent || "";
        const textLength = turnText.length;
        let images = 0;
        for (const img of turn.querySelectorAll("img")) {
          images++;
          if (!img.complete) pendingImages++;
        }
        visible.push(`${key}:${textLength}:${images}:${turnText.slice(0, 32)}:${turnText.slice(-32)}`);
      }
      return {
        value: `${scrollHost.scrollHeight}|${visible.join("|")}|pending=${pendingImages}`,
        pendingImages
      };
    }
    async function waitForSettled({ minimum = 450, maximum = 3e3 } = {}) {
      const began = performance.now();
      let previous = "", quiet = 0;
      while (performance.now() - began < maximum) {
        checkCancelled();
        await sleep(145);
        const observed = viewportSignature();
        quiet = observed.value === previous ? quiet + 1 : 0;
        previous = observed.value;
        const elapsed = performance.now() - began;
        if (elapsed >= minimum && quiet >= 2 && (observed.pendingImages === 0 || elapsed >= 1350)) {
          await afterPaint();
          return observed.pendingImages === 0;
        }
      }
      scanStats.slowSteps++;
      await afterPaint();
      return false;
    }
    async function scan() {
      const originalTop = scrollHost.scrollTop;
      const scanWarnings = [];
      try {
        showProgress("Moving to the start of the conversation", 0, scanSummary());
        for (let retry = 0; retry < 6; retry++) {
          checkCancelled();
          scrollHost.scrollTop = 0;
          await waitForSettled({ minimum: 500, maximum: 2700 });
          if (scrollHost.scrollTop <= 2) {
            scanStats.topReached = true;
            break;
          }
        }
        await collectVisibleMessages();
        const scanStep = Math.max(180, Math.min(520, Math.floor(scrollHost.clientHeight * 0.5)));
        let unchangedBottom = 0;
        let previousBottomSignature = "";
        for (let i = 0; i < 750; i++) {
          checkCancelled();
          scanStats.steps++;
          const maxTop = Math.max(0, scrollHost.scrollHeight - scrollHost.clientHeight);
          const next = Math.min(maxTop, scrollHost.scrollTop + scanStep);
          scrollHost.scrollTop = next;
          await waitForSettled({ minimum: 480, maximum: 2800 });
          await collectVisibleMessages();
          const atBottom = scrollHost.scrollTop + scrollHost.clientHeight >= scrollHost.scrollHeight - 3;
          const bottomSignature = `${scrollHost.scrollHeight}:${scrollHost.scrollTop}:${scanSummary()}`;
          unchangedBottom = atBottom && bottomSignature === previousBottomSignature ? unchangedBottom + 1 : 0;
          previousBottomSignature = bottomSignature;
          const position = scrollHost.scrollTop / Math.max(1, scrollHost.scrollHeight - scrollHost.clientHeight);
          showProgress(
            "Scanning conversation \xB7 scroll position " + Math.round(position * 100) + "%",
            Math.min(0.9, position * 0.9),
            scanSummary()
          );
          if (unchangedBottom >= 3) {
            scanStats.bottomReached = true;
            break;
          }
        }
        if (!scanStats.topReached) scanWarnings.push("The beginning of the conversation could not be confirmed.");
        if (!scanStats.bottomReached) scanWarnings.push("The end of the conversation could not be confirmed.");
        showProgress("Finishing transcript capture", 0.94, scanSummary());
        await waitForSettled({ minimum: 550, maximum: 2300 });
        await collectVisibleMessages();
        if (pendingVisuals?.size) {
          scanWarnings.push(`${pendingVisuals.size} visual component(s) used the HTML fallback; static snapshot unavailable.`);
        }
      } finally {
        scrollHost.scrollTop = originalTop;
      }
      return scanWarnings;
    }
    return {
      viewportSignature,
      waitForSettled,
      scan
    };
  }

  // src/print/styles.js
  function generatePrintStyles({ title, exportDate, opts }) {
    const pal = palette[opts.theme];
    const pageHeader = opts.titleAndDate ? `
    @top-left { content: ${quotedCSS(title)}; font: 8pt Arial, sans-serif; color: ${pal.muted}; }
    @top-right { content: ${quotedCSS(exportDate)}; font: 8pt Arial, sans-serif; color: ${pal.muted}; }
  ` : "";
    const pageFooter = opts.pageNumbers ? `
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt Arial, sans-serif; color: ${pal.muted}; }
  ` : "";
    return `
    @page {
      size: ${opts.paper};
      margin: 19mm 17mm 19mm;
      background: ${pal.page};
      ${pageHeader}
      ${pageFooter}
    }
    @page:first { @top-left { content: none; } @top-right { content: none; } }
    :root {
      --page: ${pal.page}; --text: ${pal.text}; --muted: ${pal.muted};
      --border: ${pal.border}; --user: ${pal.user}; --code: ${pal.code};
      --table-head: ${pal.table}; --stripe: ${pal.stripe};
      --accent: ${pal.accent}; --inline: ${pal.inline};
      --user-line: ${pal.userLine};
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--page); color: var(--text); }
    body { font: 10.5pt/1.53 Arial, Helvetica, sans-serif; overflow-wrap: anywhere; }
    .doc-header { padding: 0 0 5mm; margin: 0 0 7mm; border-bottom: 1px solid var(--border); }
    .doc-header h1 { font-size: 21pt; letter-spacing: -.02em; line-height: 1.2; margin: 0 0 2mm; font-weight: 700; }
    .doc-meta { color: var(--muted); font-size: 8.4pt; }
    .doc-meta a { color: inherit; text-decoration: underline; }
    .export-scan-warning {border:1px solid #dc9253;background:#fff3d8;color:#653508;padding:3mm;border-radius:2mm;margin:0 0 6mm;font:9pt/1.45 Arial,sans-serif;}
    /* Fragment long messages freely. Avoid keeping a whole answer or a
       long multiline user message on one page. */
    .message { margin: 0 0 6mm; break-inside: auto; }
    .message.short-message { break-inside: avoid-page; }
    .message.user { break-after: auto; page-break-after: auto;
      border-left: 3px solid var(--user-line); border-radius: 2.5mm;
      padding: 3mm 4mm 3mm 3.5mm;
      ${opts.userBubbles ? "background: var(--user);" : "background: transparent;"}
    }
    /* Only a compact question should stay with the beginning of an answer.
       Do not chain multiple avoid rules across large answer sections. */
    .message.user.keep-with-answer { break-after: avoid-page; }
    .message.assistant .role { break-after: avoid-page; }
    .role { font: 700 8pt/1.4 Arial, sans-serif; letter-spacing: .075em; text-transform: uppercase;
            color: var(--muted); margin: 0 0 2mm; break-after: avoid-page; }
    .message.user .role { color: var(--user-line); font-weight: 800; letter-spacing: .09em;
      font-size: 8.3pt; margin-bottom: 2.3mm; }
    .message.user .message-content { background: transparent; padding: 0; }
    .message-content > :last-child, .message-content > div > :last-child { margin-bottom: 0; }
    h1,h2,h3,h4,h5,h6 { line-height: 1.28; color: var(--text); margin: 5mm 0 2mm; break-after: avoid; }
    .message-content h1 { font-size: 18pt; }
    .message-content h2 { font-size: 14.3pt; }
    .message-content h3 { font-size: 11.5pt; }
    .message-content h4,.message-content h5,.message-content h6 { font-size: 10.5pt; }
    p { margin: 0 0 2.7mm; orphans: 3; widows: 3; }
    ul, ol { margin: 1.8mm 0 3mm; padding-left: 6.5mm; }
    li { padding-left: .6mm; margin: 0 0 1mm; }
    /* Keep original newlines without making an entire JSON/configuration block unbreakable. */
    .preserve-lines { white-space: pre-wrap; overflow-wrap: anywhere; break-inside: auto; }
    pre { display: block; margin: 2.5mm 0 3.5mm; padding: 3mm 3.5mm;
          background: var(--code); border: 1px solid var(--border); border-radius: 2mm;
          white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word;
          font: 8.7pt/1.45 Consolas, 'Liberation Mono', monospace; break-inside: auto; }
    code, kbd { font: .91em/1.4 Consolas, 'Liberation Mono', monospace;
                background: var(--inline); border-radius: 1mm; padding: .25mm .7mm; }
    pre code { font: inherit; background: transparent; padding: 0; border: 0; }
    table { width: 100%; border-collapse: collapse; margin: 3mm 0 4mm; font-size: 9pt;
            table-layout: auto; break-inside: auto; }
    thead { display: table-header-group !important; }
    thead tr { break-inside: avoid; }
    tfoot { display: table-footer-group; }
    th, td { padding: 2mm 2.5mm; border: 1px solid var(--border); text-align: left;
             vertical-align: top; overflow-wrap: anywhere; }
    th { background: var(--table-head); font-weight: 700; }
    tbody tr:nth-child(even) { background: var(--stripe); }
    tr { break-inside: avoid; }
    blockquote { border-left: 3px solid var(--border); padding: 1mm 0 1mm 3mm;
                 margin: 3mm 0; color: var(--muted); }
    a { color: var(--accent); text-decoration: underline; overflow-wrap: anywhere; }
    img, svg, canvas { max-width: 100%; height: auto; break-inside: avoid; }
    .export-image { object-fit: contain; }
    .export-visual-grid { display: grid; gap: 3mm; align-items: start; break-inside: avoid-page; }
    .export-visual-row { display: flex; flex-direction: row; gap: 3mm; align-items: flex-start; break-inside: avoid-page; }
    .export-visual-grid > *, .export-visual-row > * { min-width: 0; max-width: 100%; }
    .export-visual-grid img, .export-visual-row img { max-width: 100%; max-height: 60mm; }
    .export-color-block { display: block; min-width: 8px; }
    .message-attachments { display: flex; flex-wrap: wrap; gap: 2mm; margin-top: 2.5mm; }
    .attachment-pill { display: inline-flex; align-items: center; max-width: 100%; padding: 1.25mm 2.3mm;
      gap: 1.5mm; border: 1px solid var(--border); background: var(--code); border-radius: 20mm;
      font-size: 8pt; break-inside: avoid; overflow-wrap: anywhere; }
    .attachment-pill .attachment-type { color: var(--accent); font: 700 7pt Arial,sans-serif;
      min-width: 3mm; }
    .chat-only-download::after { content: ' (available in original conversation)';
      font-size: .82em; color: var(--muted); }
    .component-snapshot { max-width: 100%; max-height: 128mm; object-fit: contain;
      break-inside: avoid-page; display: block; }

    .message-content img, .message-content svg { vertical-align: middle; }
    .message-content > div > img, .message-content figure img,
    .message-content > div > svg, figure svg { display: block; margin: 2mm auto; }
    img { max-height: 112mm; object-fit: contain; }
    .message-content figure img { max-height: 118mm; }
    figure { margin: 3mm 0; break-inside: auto; }
    figure:has(img,svg,canvas) { break-inside: avoid-page; }
    figcaption { font-size: 8.3pt; color: var(--muted); }
    hr { border: 0; border-top: 1px solid var(--border); margin: 4mm 0; }
    .message-content :first-child { margin-top: 0; }
    @media print {
      html, body, .message-content, table, th, td, pre, code {
        print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
      }
    }
  `;
  }

  // src/print/document.js
  function isTransientProgress(item, next, includeProgress = false) {
    if (includeProgress || !next || !item.classList.contains("assistant") || !next.classList.contains("assistant")) return false;
    const body = item.querySelector(".message-content");
    if (!body || body.querySelector("pre,table,figure,.message-attachments")) return false;
    const value = (body.textContent || "").replace(/\s+/g, " ").trim();
    if (value.length > 560) return false;
    const phrases = [
      /^(?:i(?:'|’)ll|i will|i am|i(?:'|’)m)\s+(?:update|check|inspect|run|build|test|fix|review|compare|create|package|look|start)/i,
      /^(?:the|this|those)\s+.{1,120}\b(?:passed|failed|is ready|are ready)\b.{0,200}\b(?:checking|testing|packaging|rerunning|running)/i,
      /^(?:i found|i(?:'|’)ve (?:added|removed|updated|finished|found)).{0,160}\b(?:testing|checking|before packaging|next)\b/i,
      /\b(?:i(?:'|’)m|i(?:'|’)ll|i will)\s+(?:checking|testing|verifying|packaging|updating|changing|adding|building|generating|comparing|rerunning|running|reviewing|finishing)\b/i
    ];
    return phrases.some((re) => re.test(value));
  }
  function assembleDocument({
    doc,
    title,
    sourceURL,
    exportDate,
    opts,
    transcript,
    scanWarnings
  }) {
    const css = doc.createElement("style");
    css.textContent = generatePrintStyles({ title, exportDate, opts });
    doc.head.appendChild(css);
    const meta = doc.createElement("meta");
    meta.setAttribute("charset", "utf-8");
    doc.head.prepend(meta);
    const cover = doc.createElement("header");
    cover.className = "doc-header";
    const heading = doc.createElement("h1");
    heading.textContent = title;
    cover.appendChild(heading);
    if (opts.titleAndDate) {
      const info = doc.createElement("div");
      info.className = "doc-meta";
      info.append(`Exported ${exportDate}  \xB7  `);
      const link = doc.createElement("a");
      link.href = sourceURL;
      link.textContent = "Open original conversation";
      info.appendChild(link);
      cover.appendChild(info);
    }
    doc.body.appendChild(cover);
    if (scanWarnings.length) {
      const warning = doc.createElement("p");
      warning.className = "export-scan-warning";
      warning.textContent = "Export may be incomplete: " + scanWarnings.join(" ") + " Try reloading the conversation and exporting again.";
      doc.body.appendChild(warning);
    }
    let omittedProgress = 0;
    transcript.forEach((section, index) => {
      if (isTransientProgress(section, transcript[index + 1], opts.includeProgress)) {
        omittedProgress++;
      } else {
        doc.body.appendChild(section);
      }
    });
    if (omittedProgress) console.info(`ChatGPT PDF: skipped ${omittedProgress} transient progress updates.`);
  }
  function openPrintWindow(doc) {
    const file = new Blob(["<!doctype html>\n" + doc.documentElement.outerHTML], {
      type: "text/html;charset=utf-8"
    });
    const url = URL.createObjectURL(file);
    const printWindow = window.open(url, "_blank");
    if (!printWindow) {
      URL.revokeObjectURL(url);
      throw new Error("Allow pop-ups for chatgpt.com to print the conversation.");
    }
    printWindow.addEventListener("load", async () => {
      try {
        await printWindow.document.fonts?.ready;
        await Promise.race([
          Promise.all([...printWindow.document.images].map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          }))),
          sleep(4e3)
        ]);
      } catch {
      }
      printWindow.focus();
      printWindow.print();
    }, { once: true });
    setTimeout(() => URL.revokeObjectURL(url), 12e4);
  }

  // src/index.js
  (async () => {
    if (window.__chatPdfExportRunning) return;
    window.__chatPdfExportRunning = true;
    let progress = null;
    try {
      let scanSummary = function() {
        const attachments = [...collected.values()].reduce((sum, section) => sum + section.querySelectorAll(".attachment-pill").length, 0);
        return `${scanStats.seenTurns.size} turns detected \xB7 ${collected.size} messages \xB7 ${attachments} attachment pills`;
      };
      const scrollHost = document.querySelector('[role="region"][aria-label="Conversation"]');
      if (!scrollHost) throw new Error("Conversation not found. Open a ChatGPT conversation first.");
      let saved = {};
      try {
        saved = (await chrome.storage.sync.get("pdfExportSettings")).pdfExportSettings || {};
      } catch (error) {
        console.warn("Using default PDF export settings:", error);
      }
      const opts = { ...defaults, ...saved };
      if (!["light", "dark", "black"].includes(opts.theme)) opts.theme = "light";
      if (!["A4", "Letter"].includes(opts.paper)) opts.paper = "A4";
      progress = createProgressIndicator();
      const { progressHost, showProgress, checkCancelled } = progress;
      const scanStats = {
        seenTurns: /* @__PURE__ */ new Set(),
        visualCandidates: 0,
        visualSnapshots: 0,
        visualFallbacks: 0,
        steps: 0,
        slowSteps: 0,
        topReached: false,
        bottomReached: false
      };
      const rawTitle = (document.title || "").replace(/\s*[-|]\s*ChatGPT\s*$/, "").trim();
      const title = rawTitle && rawTitle !== "ChatGPT" ? rawTitle : "ChatGPT Conversation";
      const sourceURL = location.href;
      const exportedAt = /* @__PURE__ */ new Date();
      const exportDate = exportedAt.toLocaleDateString(void 0, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
      const collected = /* @__PURE__ */ new Map();
      const doc = document.implementation.createHTMLDocument(title);
      let scanner = null;
      const snapshotManager = createSnapshotManager({
        scrollHost,
        getProgressHost: () => progressHost,
        checkCancelled,
        waitForSettled: (args) => scanner.waitForSettled(args),
        scanStats
      });
      const userAttachmentNodes = /* @__PURE__ */ new WeakSet();
      const clean = createDomCleaner({
        doc,
        snapshotCache: snapshotManager.snapshotCache,
        userAttachmentNodes
      });
      async function collectVisibleMessages() {
        for (const turn of scrollHost.querySelectorAll("[data-turn-key]")) {
          const key = turn.getAttribute("data-turn-key");
          if (!key) continue;
          scanStats.seenTurns.add(key);
          const user = turn.querySelector("[data-chatgpt-search-message-ids], .group\\/user-message");
          const userSource = user?.querySelector(".bg-user-message") || user?.querySelector('[dir="auto"]') || user;
          const candidates = [...turn.querySelectorAll(
            '[class*="entity-prose-inset"], .markdown, [class*="markdown"]'
          )].filter((element) => !user?.contains(element));
          const assistantSources = candidates.filter(
            (element) => !candidates.some((other) => other !== element && other.contains(element))
          );
          async function add(role, source, suffix) {
            const attachments = role === "user" ? extractAttachments(doc, turn, user, source, assistantSources, userAttachmentNodes) : null;
            if (!hasContent(source) && !attachments?.childNodes.length) return;
            const section = doc.createElement("section");
            section.className = `message ${role}`;
            const roleLabel = doc.createElement("div");
            roleLabel.className = "role";
            roleLabel.textContent = role === "user" ? "You" : "ChatGPT";
            section.appendChild(roleLabel);
            const body = doc.createElement("div");
            body.className = "message-content";
            if (role === "assistant") await snapshotManager.prepareVisualSnapshots(source);
            body.appendChild(clean(source, false, role));
            if (attachments?.childNodes.length) body.appendChild(attachments);
            section.appendChild(body);
            const compactText = (source.innerText || "").trim();
            if (compactText.length < 230 && compactText.split(/\r?\n/).length <= 5 && !source.querySelector("table, pre, img, svg, figure")) {
              section.classList.add("short-message");
              if (role === "user") section.classList.add("keep-with-answer");
            }
            const id = `${key}:${suffix}`;
            const old = collected.get(id);
            if (!old || section.textContent.length > old.textContent.length || section.querySelectorAll("img,.attachment-pill").length > old.querySelectorAll("img,.attachment-pill").length) {
              collected.set(id, section);
            }
          }
          await add("user", userSource, "user");
          for (let index = 0; index < assistantSources.length; index++) {
            await add("assistant", assistantSources[index], `assistant:${index}`);
          }
        }
      }
      scanner = createConversationScanner({
        scrollHost,
        scanStats,
        checkCancelled,
        showProgress,
        scanSummary,
        collectVisibleMessages,
        pendingVisuals: snapshotManager.pendingVisuals
      });
      const scanWarnings = await scanner.scan();
      if (collected.size === 0) throw new Error("No conversation turns found to export.");
      if (scanWarnings.length) console.warn("ChatGPT PDF: incomplete scan:", scanWarnings.join(" "));
      else console.info(`ChatGPT PDF: visited top and bottom; ${scanSummary()}. Complete transcript coverage cannot be guaranteed from virtualized DOM alone.`);
      const transcript = [...collected.values()];
      assembleDocument({
        doc,
        title,
        sourceURL,
        exportDate,
        opts,
        transcript,
        scanWarnings
      });
      if (snapshotManager.getSnapshotCount()) {
        console.info(`ChatGPT PDF: captured ${snapshotManager.getSnapshotCount()} static component snapshots.`);
      }
      showProgress("Preparing printable PDF", 0.98, scanSummary());
      console.info(`ChatGPT PDF scan: ${scanStats.steps} overlapping steps; ${scanStats.slowSteps} steps needed extra loading time; ${scanStats.visualSnapshots}/${scanStats.visualCandidates} visual snapshots, ${snapshotManager.pendingVisuals.size} unresolved static snapshots.`);
      openPrintWindow(doc);
    } catch (error) {
      alert("ChatGPT PDF export: " + error.message);
      console.error("ChatGPT PDF export failed:", error);
    } finally {
      progress?.remove();
      window.__chatPdfExportRunning = false;
    }
  })();
})();
