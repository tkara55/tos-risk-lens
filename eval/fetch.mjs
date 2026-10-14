// Downloads the corpus into eval/cache/ (gitignored: the texts are copyrighted).
// Prints a sha256 per document so a run can be tied to the exact text that was scored.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const corpus = JSON.parse(readFileSync('eval/corpus.json', 'utf8'));
mkdirSync('eval/cache', { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

for (const doc of corpus.documents) {
  const res = await fetch(doc.url, { headers: { 'user-agent': UA, 'accept-language': doc.lang === 'tr' ? 'tr-TR,tr' : 'en-US,en' } });
  const html = await res.text();
  writeFileSync(`eval/cache/${doc.id}.html`, html);
  console.log(`${doc.id.padEnd(12)} ${res.status} ${String(html.length).padStart(8)} B  sha256:${createHash('sha256').update(html).digest('hex').slice(0, 16)}`);
}
