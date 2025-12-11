// backend/utils/fileParser.js
const fs = require('fs/promises');
const path = require('path');
const pdfParseModule = require('pdf-parse');
const pdfParse = pdfParseModule.default || pdfParseModule; // handle ESM/CJS export
const mammoth = require('mammoth');

/**
 * parseFile(filePath)
 * - Detects file extension and delegates to the appropriate parser.
 * - Supported: .pdf, .doc, .docx, .txt
 */
async function parseFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.pdf':
      return parsePdf(filePath);
    case '.doc':
    case '.docx':
      return parseDoc(filePath);
    case '.txt':
      return parseText(filePath);
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
}

/**
 * parsePdf(filePath)
 * - Uses pdf-parse to extract text from a PDF Buffer.
 * - Returns a trimmed string of the extracted text or a helpful message when none found.
 */
async function parsePdf(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    // pdfParse is a function that accepts a Buffer
    const data = await pdfParse(fileBuffer);

    const text = (data && data.text) ? data.text.trim() : '';

    if (!text) {
      // include page count if available
      const pageCount = data && data.numpages ? data.numpages : 'unknown';
      return `PDF (${pageCount} pages) contains no extractable plain text.`;
    }

    return text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file.');
  }
}

/**
 * parseDoc(filePath)
 * - Uses mammoth to extract text from .docx/.doc.
 */
async function parseDoc(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value ? result.value.trim() : '';
  } catch (error) {
    console.error('Error parsing DOC/DOCX:', error);
    throw new Error('Failed to parse Word document.');
  }
}

/**
 * parseText(filePath)
 * - Reads plain text files (utf8)
 */
async function parseText(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    console.error('Error reading TXT file:', error);
    throw new Error('Failed to read text file.');
  }
}

module.exports = { parseFile };
