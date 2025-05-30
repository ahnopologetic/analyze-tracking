/**
 * @fileoverview Central export for all detector modules
 * @module analyze/javascript/detectors
 */

const { detectAnalyticsSource } = require('./analytics-source');

module.exports = {
  detectAnalyticsSource
};
