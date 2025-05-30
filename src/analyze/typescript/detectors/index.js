/**
 * @fileoverview Central export for all detector modules
 * @module analyze/typescript/detectors
 */

const { detectAnalyticsSource } = require('./analytics-source');

module.exports = {
  detectAnalyticsSource
};
