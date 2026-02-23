import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---
const README_PATH = './README.md';
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.next'];
const TEST_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

const LANGUAGE_CONFIG: Record<string, { name: string; comment: RegExp | string }> = {
  '.ts': { name: 'TypeScript', comment: /\/\/|\/\*|\*/ },
  '.tsx': { name: 'TypeScript JSX', comment: /\/\/|\/\*|\*/ },
  '.py': { name: 'Python', comment: '#' },
  '.js': { name: 'JavaScript', comment: /\/\/|\/\*|\*/ },
  '.jsx': { name: 'JavaScript JSX', comment: /\/\/|\/\*|\*/ },
  '.yaml': { name: 'YAML', comment: '#' },
  '.yml': { name: 'YAML', comment: '#' },
  'Makefile': { name: 'Makefile', comment: '#' },
};

interface Stats {
  files: number;
  lines: number;
  blank: number;
  comment: number;
  code: number;
}

// --- Logic ---

function analyzeFile(filePath: string, commentPattern: RegExp | string): Stats {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const stats: Stats = { files: 1, lines: lines.length, blank: 0, comment: 0, code: 0 };

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed === '') {
      stats.blank++;
    } else if (typeof commentPattern === 'string' ? trimmed.startsWith(commentPattern) : commentPattern.test(trimmed)) {
      stats.comment++;
    } else {
      stats.code++;
    }
  });

  return stats;
}

function getStats(dir: string, statsMap = new Map<string, Stats>()): Map<string, Stats> {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(item)) getStats(fullPath, statsMap);
      continue;
    }

    const ext = path.extname(item) || item;
    const config = LANGUAGE_CONFIG[ext];
    
    if (config) {
      const isTest = TEST_PATTERN.test(item);
      const displayName = isTest ? `${config.name} (Test)` : config.name;
      
      const fileStats = analyzeFile(fullPath, config.comment);
      const current = statsMap.get(displayName) || { files: 0, lines: 0, blank: 0, comment: 0, code: 0 };
      
      statsMap.set(displayName, {
        files: current.files + 1,
        lines: current.lines + fileStats.lines,
        blank: current.blank + fileStats.blank,
        comment: current.comment + fileStats.comment,
        code: current.code + fileStats.code,
      });
    }
  }
  return statsMap;
}

function formatOutput(statsMap: Map<string, Stats>): string {
  const pad = (v: any, l: number, left = false) => left ? String(v).padEnd(l) : String(v).padStart(l);
  const header = `${pad('Language', 20, true)}${pad('Files', 10)}${pad('Lines', 12)}${pad('Blank', 10)}${pad('Comment', 12)}${pad('Code', 12)}`;
  const sep = '-'.repeat(header.length);
  
  const rows = [header, sep];
  const totals = { files: 0, lines: 0, blank: 0, comment: 0, code: 0 };

  Array.from(statsMap.entries())
    .sort((a, b) => b[1].code - a[1].code)
    .forEach(([name, s]) => {
      rows.push(`${pad(name, 20, true)}${pad(s.files, 10)}${pad(s.lines, 12)}${pad(s.blank, 10)}${pad(s.comment, 12)}${pad(s.code, 12)}`);
      Object.keys(totals).forEach(k => (totals as any)[k] += (s as any)[k]);
    });

  rows.push(sep, `${pad('Total', 20, true)}${pad(totals.files, 10)}${pad(totals.lines, 12)}${pad(totals.blank, 10)}${pad(totals.comment, 12)}${pad(totals.code, 12)}`, sep);

  // Generate Badge
  const badgeColor = totals.code > 10000 ? 'orange' : 'blue';
  const badge = `![Lines of Code](https://img.shields.io/badge/Lines%20of%20Code-${totals.code}-blue)`;

  return `${badge}\n\n\`\`\`\n${rows.join('\n')}\n\`\`\``;
}

// --- Execution ---
const stats = getStats('.');
const result = formatOutput(stats);
const readme = fs.readFileSync(README_PATH, 'utf-8');
const locRegex = /!\[Lines of Code\]\(https:\/\/img\.shields\.io\/badge\/Lines%20of%20Code-\d+-\w+\)\n\n```\nLanguage[\s\S]*?```\n?/g;
let updated = readme;
if (locRegex.test(readme)) {
  updated = readme.replace(locRegex, result);
} else {
  updated = result + '\n\n' + readme;
}
fs.writeFileSync(README_PATH, updated);