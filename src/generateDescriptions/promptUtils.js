/**
 * @fileoverview Utilities for creating LLM prompts with code snippets
 * @module analyze-tracking/generateDescriptions/promptUtils
 */

const fs = require('fs');
const path = require('path');

function createPrompt(eventName, properties, implementations, codebaseDir) {
  let prompt = `Event Name: "${eventName}"\n\n`;
  prompt += `Properties:\n`;

  function appendPropertiesToPrompt(properties, indent = '') {
    for (const propName in properties) {
      const prop = properties[propName];
      prompt += `${indent}- "${propName}" (type: ${prop.type})\n`;
      if (prop.properties) {
        prompt += `${indent}  Sub-properties:\n`;
        appendPropertiesToPrompt(prop.properties, indent + '    ');
      }
    }
  }

  appendPropertiesToPrompt(properties);

  // Add implementations with code snippets
  prompt += `\nImplementations:\n`;
  for (const impl of implementations) {
    const codeSnippet = getCodeSnippet(path.join(codebaseDir, impl.path), impl.line);
    prompt += `- Path: "${impl.path}", Line: ${impl.line}, Function: "${impl.function}", Destination: "${impl.destination}"\n`;
    prompt += `Code Snippet:\n`;
    prompt += '```\n';
    prompt += codeSnippet + '\n';
    prompt += '```\n';
  }

  return prompt;
}

function getCodeSnippet(filePath, lineNumber, contextLines = 5) {
  // Extract a code snippet from the file around the specified line
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    const startLine = Math.max(0, lineNumber - contextLines - 1);
    const endLine = Math.min(lines.length, lineNumber + contextLines);

    const snippetLines = lines.slice(startLine, endLine);
    return snippetLines.join('\n');
  } catch (e) {
    // Only log errors if not in test mode
    if (process.env.NODE_ENV !== 'test' && !process.env.NODE_TEST_CONTEXT) {
      console.error(`Failed to read file ${filePath}:`, e);
    }
    return '';
  }
}

module.exports = {
  createPrompt,
  getCodeSnippet
};
