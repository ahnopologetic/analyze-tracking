/**
 * @fileoverview Central export for all extractor modules
 * @module analyze/typescript/extractors
 */

const { extractEventData, processEventData } = require('./event-extractor');
const { extractProperties, extractInterfaceProperties } = require('./property-extractor');

module.exports = {
  extractEventData,
  processEventData,
  extractProperties,
  extractInterfaceProperties
};
