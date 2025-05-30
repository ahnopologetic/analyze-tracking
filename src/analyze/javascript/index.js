/**
 * @fileoverview JavaScript analytics tracking analyzer - main entry point
 * @module analyze/javascript
 */

const { parseFile, findTrackingEvents, FileReadError, ParseError } = require('./parser');

/**
 * Analyzes a JavaScript file for analytics tracking calls
 * @param {string} filePath - Path to the JavaScript file to analyze
 * @param {string} [customFunction] - Optional custom function name to detect
 * @returns {Array<Object>} Array of tracking events found in the file
 */
function analyzeJsFile(filePath, customFunction) {
  const events = [];

  try {
    // Parse the file into an AST
    const ast = parseFile(filePath);

    // Find and extract tracking events
    const foundEvents = findTrackingEvents(ast, filePath, customFunction);
    events.push(...foundEvents);

  } catch (error) {
    if (error instanceof FileReadError) {
      console.error(`Error reading file ${filePath}: ${error.originalError.message}`);
    } else if (error instanceof ParseError) {
      console.error(`Error parsing file ${filePath}: ${error.originalError.message}`);
    } else {
      console.error(`Unexpected error analyzing ${filePath}: ${error.message}`);
    }
  }

  return events;
}

module.exports = { analyzeJsFile };
