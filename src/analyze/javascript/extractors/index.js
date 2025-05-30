/**
 * @fileoverview Central export for all extractor modules
 * @module analyze/javascript/extractors
 */

const { extractEventData, processEventData } = require('./event-extractor');
const { extractProperties } = require('./property-extractor');

module.exports = {
  extractEventData,
  processEventData,
  extractProperties
};
