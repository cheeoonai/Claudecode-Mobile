#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

const skillScripts = join(homedir(), '.claude', 'skills', 'follow-builders', 'scripts');

const prep = spawnSync('node', [join(skillScripts, 'prepare-digest.js')], {
  encoding: 'utf-8',
  maxBuffer: 64 * 1024 * 1024
});

if (prep.status !== 0) {
  console.error(prep.stderr || 'prepare-digest exited non-zero');
  process.exit(1);
}

const data = JSON.parse(prep.stdout);
if (data.status === 'error') {
  console.error('prepare-digest error:', data.message);
  process.exit(1);
}

const lang = data.config?.language || 'en';
const p = data.prompts || {};

const system = [
  'You are producing a daily AI Builders digest from data the caller has already fetched.',
  '',
  p.digest_intro || '',
  '',
  '# How to summarize tweets',
  p.summarize_tweets || '',
  '',
  '# How to summarize podcasts',
  p.summarize_podcast || '',
  '',
  '# How to summarize blogs',
  p.summarize_blogs || '',
  lang !== 'en' ? `\n# Language\n${p.translate || ''}\nProduce the digest in: ${lang}\n` : '',
  '',
  'Critical rules:',
  '- Use ONLY the data provided in the user message. Do NOT fetch from the web. Do NOT invent content.',
  '- Every item must include the source URL provided in the data.',
  '- Output Markdown suitable for Telegram. Keep it tight.',
  '- If there is genuinely no new content across all feeds, output exactly: NO_NEW_CONTENT'
].join('\n');

const user = [
  `Generated at: ${data.generatedAt}`,
  `Stats: ${JSON.stringify(data.stats)}`,
  '',
  '== X / Twitter ==',
  JSON.stringify(data.x, null, 2),
  '',
  '== Podcasts ==',
  JSON.stringify(data.podcasts, null, 2),
  '',
  '== Blogs ==',
  JSON.stringify(data.blogs, null, 2),
  '',
  'Produce the digest now.'
].join('\n');

const client = new Anthropic();
const resp = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 8000,
  system,
  messages: [{ role: 'user', content: user }]
});

const text = resp.content
  .filter(c => c.type === 'text')
  .map(c => c.text)
  .join('\n')
  .trim();

if (text === 'NO_NEW_CONTENT' || text === '') {
  process.exit(0);
}

process.stdout.write(text + '\n');
