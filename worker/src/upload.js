/**
 * Learning-material text extraction.
 * Supported: .txt (direct), .docx (unzip + document.xml text runs).
 * PDF: not supported in-worker — we say so plainly instead of pretending.
 * Limits: 5 MB max, output truncated to a sane size for the AI prompt.
 */

import { unzipSync } from 'fflate';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_EXTRACT_CHARS = 15000;

export function detectKind(filename, bytes) {
  const name = (filename || '').toLowerCase();
  if (name.endsWith('.txt')) return 'txt';
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.pdf')) return 'pdf';
  // magic bytes fallback
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'docx'; // PK zip
  return 'unknown';
}

function extractTxt(bytes) {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function extractDocx(bytes) {
  let unzipped;
  try {
    unzipped = unzipSync(bytes);
  } catch {
    throw new Error('Could not unzip this .docx file. It may be corrupt.');
  }
  const xmlFile = unzipped['word/document.xml'];
  if (!xmlFile) throw new Error('This .docx file has no readable document content.');
  const xml = new TextDecoder().decode(xmlFile);
  // Pull text runs; preserve paragraph breaks.
  const withBreaks = xml
    .replace(/<\/w:p[^>]*>/g, '\n')
    .replace(/<\/w:tr[^>]*>/g, '\n');
  const runs = [...withBreaks.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
    .map(m => m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"'));
  const text = runs.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) throw new Error('No readable text found in this .docx file.');
  return text;
}

/**
 * @returns {ok, text?, kind?, error?}
 * Never throws for user-facing problems — returns a clean error instead.
 */
export function extractMaterialText(filename, bytes) {
  if (!bytes || bytes.length === 0) return { ok: false, error: 'The uploaded file is empty.' };
  if (bytes.length > MAX_FILE_BYTES) {
    return { ok: false, error: `File is too large (${(bytes.length / 1048576).toFixed(1)} MB). Maximum is 5 MB.` };
  }
  const kind = detectKind(filename, bytes);
  try {
    if (kind === 'txt') {
      const text = extractTxt(bytes).trim();
      if (!text) return { ok: false, error: 'No readable text found in this file.' };
      return { ok: true, kind, text: text.slice(0, MAX_EXTRACT_CHARS) };
    }
    if (kind === 'docx') {
      const text = extractDocx(bytes);
      return { ok: true, kind, text: text.slice(0, MAX_EXTRACT_CHARS) };
    }
    if (kind === 'pdf') {
      return { ok: false, error: 'PDF text extraction is not available yet. Please upload the material as .txt or .docx.' };
    }
    return { ok: false, error: 'Unsupported file type. Please upload .txt or .docx.' };
  } catch (e) {
    return { ok: false, error: e.message || 'Could not read this file.' };
  }
}
