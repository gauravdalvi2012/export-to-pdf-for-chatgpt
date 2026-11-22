import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const summaryPath = resolve('coverage/coverage-summary.json');
const badgeJsonPath = resolve('.github/badges/coverage.json');
const badgeSvgPath = resolve('.github/badges/coverage.svg');

if (!existsSync(summaryPath)) {
  console.warn('⚠️ No coverage summary found at', summaryPath);
  process.exit(0);
}

try {
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const total = summary.total;
  const pct = Math.round(total.lines.pct);

  let colorHex = '#e05d44'; // red
  let colorName = 'red';

  if (pct >= 85) {
    colorHex = '#4c1'; // brightgreen
    colorName = 'brightgreen';
  } else if (pct >= 80) {
    colorHex = '#2ea44f'; // green
    colorName = 'green';
  } else if (pct >= 70) {
    colorHex = '#a4a61d'; // yellowgreen
    colorName = 'yellowgreen';
  } else if (pct >= 60) {
    colorHex = '#dfb317'; // yellow
    colorName = 'yellow';
  }

  // 1. Write Shields.io endpoint JSON
  const badgeData = {
    schemaVersion: 1,
    label: 'coverage',
    message: `${pct}%`,
    color: colorName
  };

  mkdirSync(dirname(badgeJsonPath), { recursive: true });
  writeFileSync(
    badgeJsonPath,
    JSON.stringify(badgeData, null, 2) + '\n',
    'utf8'
  );

  // 2. Generate standalone SVG badge (works on private & public repos without CDN lag)
  const labelText = 'coverage';
  const valueText = `${pct}%`;
  const labelWidth = 62;
  const valueWidth = valueText.length > 3 ? 46 : 38;
  const totalWidth = labelWidth + valueWidth;

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${labelText}: ${valueText}">
  <title>${labelText}: ${valueText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${colorHex}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${(labelWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelWidth - 10) * 10}">${labelText}</text>
    <text x="${(labelWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(labelWidth - 10) * 10}">${labelText}</text>
    <text aria-hidden="true" x="${(labelWidth + valueWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(valueWidth - 10) * 10}">${valueText}</text>
    <text x="${(labelWidth + valueWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(valueWidth - 10) * 10}">${valueText}</text>
  </g>
</svg>
`;

  writeFileSync(badgeSvgPath, svgContent, 'utf8');
  console.log(`✅ Coverage badges updated: ${pct}% (${colorName})`);
  console.log(`   - JSON: ${badgeJsonPath}`);
  console.log(`   - SVG:  ${badgeSvgPath}`);
} catch (err) {
  console.error('Failed to generate coverage badge:', err);
  process.exit(1);
}
