// Dynamic social-share fallback image for news without a usable image.
// Returns a lightweight SVG image that contains the category/subcategory
// and the Maithili call-to-action "समाचार पढ़ू".

function esc(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text, maxChars = 34, maxLines = 3) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  return lines;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const title = url.searchParams.get("title") || "मैथिली समाचार";
  const category = url.searchParams.get("category") || "समाचार";
  const subcategory = url.searchParams.get("subcategory") || "";

  const label = subcategory && subcategory !== category
    ? `${category} • ${subcategory}`
    : category;

  const lines = wrapText(title, 34, 3);
  const titleSvg = lines.map((line, i) =>
    `<text x="80" y="${320 + i * 62}" class="headline">${esc(line)}</text>`
  ).join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff7ed"/>
      <stop offset="100%" stop-color="#ffedd5"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="45" y="45" width="1110" height="540" rx="28" fill="#ffffff" stroke="#fed7aa" stroke-width="4"/>
  <rect x="80" y="85" width="1040" height="90" rx="18" fill="#f97316"/>
  <text x="110" y="145" fill="#ffffff" font-family="Noto Sans Devanagari, Noto Sans, sans-serif" font-size="38" font-weight="700">${esc(label)}</text>
  ${titleSvg}
  <text x="80" y="535" fill="#c2410c" font-family="Noto Sans Devanagari, Noto Sans, sans-serif" font-size="34" font-weight="700">मिथिला केँ समाचार पढ़ू</text>
  <text x="80" y="570" fill="#78716c" font-family="Noto Sans, sans-serif" font-size="22">Maithili News</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=UTF-8",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
