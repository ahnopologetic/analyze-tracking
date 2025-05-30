/**
 * @fileoverview Constants for Go analytics tracking analysis
 * @module analyze/go/constants
 */

const ANALYTICS_SOURCES = {
  SEGMENT: 'segment',
  POSTHOG: 'posthog',
  AMPLITUDE: 'amplitude',
  MIXPANEL: 'mixpanel',
  SNOWPLOW: 'snowplow',
  CUSTOM: 'custom'
};

const MAX_RECURSION_DEPTH = 20;

module.exports = {
  ANALYTICS_SOURCES,
  MAX_RECURSION_DEPTH
};
