/**
 * @fileoverview Event deduplication utilities for Go analytics tracking
 * @module analyze/go/eventDeduplicator
 */

const { ANALYTICS_SOURCES } = require('./constants');

/**
 * Deduplicate events based on eventName, source, and function
 * For Amplitude, prefer struct literal line numbers over function call line numbers
 * @param {Array<Object>} events - Array of tracking events to deduplicate
 * @returns {Array<Object>} Array of unique tracking events
 */
function deduplicateEvents(events) {
  const uniqueEvents = [];
  const seen = new Set();
  
  for (const event of events) {
    // For Amplitude, we want to keep the line number from the struct literal
    // For other sources, we can use any line number since they don't have this issue
    const key = `${event.eventName}:${event.source}:${event.functionName}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEvents.push(event);
    } else {
      // If we've seen this event before and it's Amplitude, check if this is the struct literal version
      const existingEvent = uniqueEvents.find(e => 
        e.eventName === event.eventName && 
        e.source === event.source && 
        e.functionName === event.functionName
      );
      
      // If this is Amplitude and the existing event is from the function call (higher line number),
      // replace it with this one (from the struct literal)
      if (event.source === ANALYTICS_SOURCES.AMPLITUDE && existingEvent && existingEvent.line > event.line) {
        const index = uniqueEvents.indexOf(existingEvent);
        uniqueEvents[index] = event;
      }
    }
  }
  
  return uniqueEvents;
}

module.exports = {
  deduplicateEvents
};
