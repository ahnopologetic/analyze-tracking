/**
 * @fileoverview Analytics tracking detection for Go function calls
 * @module analyze/go/trackingDetector
 */

const { ANALYTICS_SOURCES } = require('./constants');

/**
 * Detect the analytics source from a call or struct literal node
 * @param {Object} callNode - AST node representing a function call or struct literal
 * @param {string|null} customFunction - Name of custom tracking function to detect
 * @returns {string|null} Analytics source name (e.g., 'segment', 'amplitude') or null if not recognized
 */
function detectSource(callNode, customFunction) {
  // Check for struct literals (Segment/Rudderstack/PostHog/Amplitude)
  if (callNode.tag === 'structlit') {
    if (callNode.struct) {
      if (callNode.struct.tag === 'access') {
        const structType = callNode.struct.member;
        const namespace = callNode.struct.struct?.value;
        
        // Check for specific struct types with their namespaces
        if (structType === 'Track' && namespace === 'analytics') return ANALYTICS_SOURCES.SEGMENT;
        if (structType === 'Capture' && namespace === 'posthog') return ANALYTICS_SOURCES.POSTHOG;
        if (structType === 'Event' && namespace === 'amplitude') return ANALYTICS_SOURCES.AMPLITUDE;
        
        // Fallback for struct types without namespace check (backward compatibility)
        if (structType === 'Track') return ANALYTICS_SOURCES.SEGMENT;
        if (structType === 'Capture') return ANALYTICS_SOURCES.POSTHOG;
      }
    }
    return null;
  }
  
  // For function calls, check if func property exists
  if (!callNode.func) return null;
  
  // Check for method calls (e.g., client.Track, mp.Track)
  if (callNode.func.tag === 'access') {
    const objName = callNode.func.struct?.tag === 'ident' ? callNode.func.struct.value : null;
    const methodName = callNode.func.member;
    
    if (!objName || !methodName) return null;
    
    // Check various analytics providers
    switch (true) {
      // Mixpanel: mp.Track(ctx, []*mixpanel.Event{...})
      case objName === 'mp' && methodName === 'Track':
        return ANALYTICS_SOURCES.MIXPANEL;
      
      // Amplitude: client.Track(amplitude.Event{...})
      case objName === 'client' && methodName === 'Track':
        return ANALYTICS_SOURCES.AMPLITUDE;
      
      // Snowplow: tracker.TrackStructEvent(...)
      case objName === 'tracker' && methodName === 'TrackStructEvent':
        return ANALYTICS_SOURCES.SNOWPLOW;
    }
  }
  
  // Check for custom function calls
  if (customFunction && callNode.func.tag === 'ident' && callNode.func.value === customFunction) {
    return ANALYTICS_SOURCES.CUSTOM;
  }
  
  return null;
}

module.exports = {
  detectSource
};
