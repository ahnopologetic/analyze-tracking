const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { analyzeRubyFile } = require('../src/analyze/analyzeRubyFile');

test.describe('analyzeRubyFile', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const testFilePath = path.join(fixturesDir, 'ruby', 'main.rb');
  
  test('should correctly analyze Ruby file with multiple tracking providers', async () => {
    const customFunction = 'customTrackFunction';
    const events = await analyzeRubyFile(testFilePath, customFunction);
    
    // Sort events by eventName for consistent ordering
    events.sort((a, b) => a.eventName.localeCompare(b.eventName));
    
    assert.strictEqual(events.length, 7);
    
    // Test Segment event
    const segmentEvent = events.find(e => e.eventName === 'User Signed Up');
    assert.ok(segmentEvent);
    assert.strictEqual(segmentEvent.source, 'segment');
    assert.strictEqual(segmentEvent.functionName, 'segment_track');
    assert.strictEqual(segmentEvent.line, 22);
    assert.deepStrictEqual(segmentEvent.properties, {
      user_id: { type: 'string' },
      method: { type: 'string' },
      is_free_trial: { type: 'boolean' },
      plan: { type: 'any' }
    });
    
    // Test Mixpanel event
    const mixpanelEvent = events.find(e => e.eventName === 'Purchase Completed');
    assert.ok(mixpanelEvent);
    assert.strictEqual(mixpanelEvent.source, 'mixpanel');
    assert.strictEqual(mixpanelEvent.functionName, 'mixpanel_track');
    assert.strictEqual(mixpanelEvent.line, 36);
    assert.deepStrictEqual(mixpanelEvent.properties, {
      distinct_id: { type: 'any' },
      plan: { type: 'any' },
      price: { type: 'number' }
    });
    
    // Test Rudderstack event
    const rudderstackEvent = events.find(e => e.eventName === 'Item Sold');
    assert.ok(rudderstackEvent);
    assert.strictEqual(rudderstackEvent.source, 'rudderstack');
    assert.strictEqual(rudderstackEvent.functionName, 'rudderstack_track');
    assert.strictEqual(rudderstackEvent.line, 49);
    assert.deepStrictEqual(rudderstackEvent.properties, {
      user_id: { type: 'any' },
      sku: { type: 'any' },
      shipping: { type: 'string' }
    });
    
    // Test PostHog event
    const posthogEvent = events.find(e => e.eventName === 'user_signed_up');
    assert.ok(posthogEvent);
    assert.strictEqual(posthogEvent.source, 'posthog');
    assert.strictEqual(posthogEvent.functionName, 'posthog_track');
    assert.strictEqual(posthogEvent.line, 66);
    assert.deepStrictEqual(posthogEvent.properties, {
      distinct_id: { type: 'string' },
      method: { type: 'string' },
      is_free_trial: { type: 'any' },
      plan: { type: 'any' }
    });
    
    // Test Snowplow event
    const snowplowEvent = events.find(e => e.eventName === 'add-to-basket');
    assert.ok(snowplowEvent);
    assert.strictEqual(snowplowEvent.source, 'snowplow');
    assert.strictEqual(snowplowEvent.functionName, 'snowplow_track');
    assert.strictEqual(snowplowEvent.line, 96);
    assert.deepStrictEqual(snowplowEvent.properties, {
      category: { type: 'string' },
      label: { type: 'string' },
      property: { type: 'string' },
      value: { type: 'number' }
    });
    
    // Test custom function event
    const customEvent = events.find(e => e.eventName === 'custom_event');
    assert.ok(customEvent);
    assert.strictEqual(customEvent.source, 'custom');
    assert.strictEqual(customEvent.functionName, 'custom_track_event');
    assert.strictEqual(customEvent.line, 79);
    assert.deepStrictEqual(customEvent.properties, {
      key: { type: 'string' },
      nested: { 
        type: 'object', 
        properties: { 
          a: { 
            type: 'array', 
            items: { type: 'number' } 
          } 
        } 
      }
    });
    
    // Test module event
    const moduleEvent = events.find(e => e.eventName === 'Module Event');
    assert.ok(moduleEvent);
    assert.strictEqual(moduleEvent.source, 'segment');
    assert.strictEqual(moduleEvent.functionName, 'track_something');
    assert.strictEqual(moduleEvent.line, 108);
    assert.deepStrictEqual(moduleEvent.properties, {
      anonymous_id: { type: 'string' },
      from_module: { type: 'boolean' }
    });
  });
  
  test('should handle files without tracking events', async () => {
    const emptyTestFile = path.join(fixturesDir, 'ruby', 'empty.rb');
    const events = await analyzeRubyFile(emptyTestFile, 'customTrack');
    assert.deepStrictEqual(events, []);
  });
  
  test('should handle missing custom function', async () => {
    const events = await analyzeRubyFile(testFilePath, null);
    
    // Should find all events except the custom one
    assert.strictEqual(events.length, 6);
    assert.strictEqual(events.find(e => e.source === 'custom'), undefined);
  });
  
  test('should handle nested property types correctly', async () => {
    const customFunction = 'customTrackFunction';
    const events = await analyzeRubyFile(testFilePath, customFunction);
    
    const customEvent = events.find(e => e.eventName === 'custom_event');
    assert.ok(customEvent);
    
    // Test nested object properties
    assert.deepStrictEqual(customEvent.properties.nested, {
      type: 'object',
      properties: {
        a: { 
          type: 'array', 
          items: { type: 'number' }
        }
      }
    });
  });
  
  test('should detect tracking in modules', async () => {
    const events = await analyzeRubyFile(testFilePath, null);
    
    const moduleEvent = events.find(e => e.eventName === 'Module Event');
    assert.ok(moduleEvent);
    assert.strictEqual(moduleEvent.source, 'segment');
    assert.strictEqual(moduleEvent.functionName, 'track_something');
    assert.deepStrictEqual(moduleEvent.properties, {
      anonymous_id: { type: 'string' },
      from_module: { type: 'boolean' }
    });
  });
  
  test('should handle all property types correctly', async () => {
    const customFunction = 'customTrackFunction';
    const events = await analyzeRubyFile(testFilePath, customFunction);
    
    // Test string properties
    const signupEvent = events.find(e => e.eventName === 'User Signed Up');
    assert.strictEqual(signupEvent.properties.method.type, 'string');
    assert.strictEqual(signupEvent.properties.plan.type, 'any');
    
    // Test boolean properties
    assert.strictEqual(signupEvent.properties.is_free_trial.type, 'boolean');
    
    // Test number properties
    const purchaseEvent = events.find(e => e.eventName === 'Purchase Completed');
    assert.strictEqual(purchaseEvent.properties.price.type, 'number');
    
    // Test array properties
    const customEvent = events.find(e => e.eventName === 'custom_event');
    assert.strictEqual(customEvent.properties.nested.properties.a.type, 'array');
    assert.strictEqual(customEvent.properties.nested.properties.a.items.type, 'number');
  });
  
  test('should correctly identify function names in different contexts', async () => {
    const customFunction = 'customTrackFunction';
    const events = await analyzeRubyFile(testFilePath, customFunction);
    
    // Verify function names are correctly identified
    const functionNames = events.map(e => e.functionName).sort();
    assert.deepStrictEqual(functionNames, [
      'custom_track_event',
      'mixpanel_track',
      'posthog_track',
      'rudderstack_track',
      'segment_track',
      'snowplow_track',
      'track_something'
    ]);
  });
  
  test('should correctly differentiate between Segment and Rudderstack', async () => {
    const events = await analyzeRubyFile(testFilePath, null);
    
    // Test that uppercase Analytics is detected as Segment
    const segmentEvent = events.find(e => e.eventName === 'User Signed Up');
    assert.ok(segmentEvent);
    assert.strictEqual(segmentEvent.source, 'segment');
    
    // Test that lowercase analytics is detected as Rudderstack
    const rudderstackEvent = events.find(e => e.eventName === 'Item Sold');
    assert.ok(rudderstackEvent);
    assert.strictEqual(rudderstackEvent.source, 'rudderstack');
  });
});
