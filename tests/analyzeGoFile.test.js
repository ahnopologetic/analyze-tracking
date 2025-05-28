const path = require('path');
const { analyzeGoFile } = require('../src/analyze/analyzeGoFile');

describe('analyzeGoFile', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const testFilePath = path.join(fixturesDir, 'main.go');
  
  it('should correctly analyze Go file with multiple tracking providers', async () => {
    const customFunction = 'yourCustomTrackFunctionName';
    const events = await analyzeGoFile(testFilePath, customFunction);
    
    // Sort events by eventName for consistent ordering
    events.sort((a, b) => a.eventName.localeCompare(b.eventName));
    
    expect(events).toHaveLength(6);
    
    // Test Amplitude event
    const amplitudeEvent = events.find(e => e.eventName === 'Button Clicked');
    expect(amplitudeEvent).toBeDefined();
    expect(amplitudeEvent.source).toBe('amplitude');
    expect(amplitudeEvent.functionName).toBe('amplitudeTrack');
    expect(amplitudeEvent.line).toBe(44);
    expect(amplitudeEvent.properties).toEqual({
      UserID: { type: 'string' },
      name: { type: 'string' },
      'a property': { type: 'string' },
      is_free_trial: { type: 'boolean' },
      Price: { type: 'number' }
    });
    
    // Test Segment event
    const segmentEvent = events.find(e => e.eventName === 'Signed Up');
    expect(segmentEvent).toBeDefined();
    expect(segmentEvent.source).toBe('segment');
    expect(segmentEvent.functionName).toBe('segmentTrack');
    expect(segmentEvent.line).toBe(21);
    expect(segmentEvent.properties).toEqual({
      UserId: { type: 'string' },
      plan: { type: 'string' },
      is_free_trial: { type: 'boolean' }
    });
    
    // Test Mixpanel event
    const mixpanelEvent = events.find(e => e.eventName === 'some_event');
    expect(mixpanelEvent).toBeDefined();
    expect(mixpanelEvent.source).toBe('mixpanel');
    expect(mixpanelEvent.functionName).toBe('mixpanelTrack');
    expect(mixpanelEvent.line).toBe(33);
    expect(mixpanelEvent.properties).toEqual({
      DistinctId: { type: 'string' },
      plan: { type: 'string' },
      price: { type: 'number' }
    });
    
    // Test PostHog event
    const posthogEvent = events.find(e => e.eventName === 'user_signed_up');
    expect(posthogEvent).toBeDefined();
    expect(posthogEvent.source).toBe('posthog');
    expect(posthogEvent.functionName).toBe('posthogTrack');
    expect(posthogEvent.line).toBe(64);
    expect(posthogEvent.properties).toEqual({
      DistinctId: { type: 'string' },
      login_type: { type: 'string' },
      plan: { type: 'string' },
      is_free_trial: { type: 'boolean' }
    });
    
    // Test Snowplow event
    const snowplowEvent = events.find(e => e.eventName === 'add-to-basket');
    expect(snowplowEvent).toBeDefined();
    expect(snowplowEvent.source).toBe('snowplow');
    expect(snowplowEvent.functionName).toBe('snowplowTrack');
    expect(snowplowEvent.line).toBe(81);
    expect(snowplowEvent.properties).toEqual({
      Category: { type: 'string' },
      Property: { type: 'string' },
      Value: { type: 'number' }
    });
    
    // Test custom function event
    const customEvent = events.find(e => e.eventName === 'custom_event');
    expect(customEvent).toBeDefined();
    expect(customEvent.source).toBe('custom');
    expect(customEvent.functionName).toBe('main');
    expect(customEvent.line).toBe(105);
    expect(customEvent.properties).toEqual({
      foo: { type: 'string' },
      baz: { type: 'number' },
      list: { type: 'array', items: { type: 'string' } },
      obj: {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' },
          c: { type: 'string' }
        }
      }
    });
  });
  
  it('should handle files without tracking events', async () => {
    const emptyTestFile = path.join(fixturesDir, 'empty.go');
    const events = await analyzeGoFile(emptyTestFile, 'customTrack');
    expect(events).toEqual([]);
  });
  
  it('should handle missing custom function', async () => {
    const events = await analyzeGoFile(testFilePath, null);
    
    // Should find all events except the custom one
    expect(events).toHaveLength(5);
    expect(events.find(e => e.source === 'custom')).toBeUndefined();
  });
  
  it('should handle nested property types correctly', async () => {
    const customFunction = 'yourCustomTrackFunctionName';
    const events = await analyzeGoFile(testFilePath, customFunction);
    
    const customEvent = events.find(e => e.eventName === 'custom_event');
    expect(customEvent).toBeDefined();
    
    // Test nested object properties
    expect(customEvent.properties.obj).toEqual({
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
        c: { type: 'string' }
      }
    });
    
    // Test array properties
    expect(customEvent.properties.list).toEqual({
      type: 'array',
      items: { type: 'string' }
    });
  });
  
  it('should match expected tracking-schema.yaml output', async () => {
    const customFunction = 'yourCustomTrackFunctionName';
    const events = await analyzeGoFile(testFilePath, customFunction);
    
    // Create a map of events by name for easier verification
    const eventMap = {};
    events.forEach(event => {
      eventMap[event.eventName] = event;
    });
    
    // Verify all expected events are present
    expect(Object.keys(eventMap).sort()).toEqual([
      'Button Clicked',
      'Signed Up',
      'add-to-basket',
      'custom_event',
      'some_event',
      'user_signed_up'
    ]);
    
    // Verify each event matches the expected schema format
    expect(eventMap['Signed Up']).toMatchObject({
      eventName: 'Signed Up',
      source: 'segment',
      line: 21,
      functionName: 'segmentTrack',
      properties: {
        UserId: { type: 'string' },
        plan: { type: 'string' },
        is_free_trial: { type: 'boolean' }
      }
    });
    
    expect(eventMap['some_event']).toMatchObject({
      eventName: 'some_event',
      source: 'mixpanel',
      line: 33,
      functionName: 'mixpanelTrack',
      properties: {
        DistinctId: { type: 'string' },
        plan: { type: 'string' },
        price: { type: 'number' }
      }
    });
    
    expect(eventMap['Button Clicked']).toMatchObject({
      eventName: 'Button Clicked',
      source: 'amplitude',
      line: 44,
      functionName: 'amplitudeTrack',
      properties: {
        UserID: { type: 'string' },
        name: { type: 'string' },
        'a property': { type: 'string' },
        is_free_trial: { type: 'boolean' },
        Price: { type: 'number' }
      }
    });
    
    expect(eventMap['user_signed_up']).toMatchObject({
      eventName: 'user_signed_up',
      source: 'posthog',
      line: 64,
      functionName: 'posthogTrack',
      properties: {
        DistinctId: { type: 'string' },
        login_type: { type: 'string' },
        plan: { type: 'string' },
        is_free_trial: { type: 'boolean' }
      }
    });
    
    expect(eventMap['add-to-basket']).toMatchObject({
      eventName: 'add-to-basket',
      source: 'snowplow',
      line: 81,
      functionName: 'snowplowTrack',
      properties: {
        Category: { type: 'string' },
        Property: { type: 'string' },
        Value: { type: 'number' }
      }
    });
    
    expect(eventMap['custom_event']).toMatchObject({
      eventName: 'custom_event',
      source: 'custom',
      line: 105,
      functionName: 'main',
      properties: {
        foo: { type: 'string' },
        baz: { type: 'number' },
        list: { 
          type: 'array', 
          items: { type: 'string' }
        },
        obj: {
          type: 'object',
          properties: {
            a: { type: 'number' },
            b: { type: 'number' },
            c: { type: 'string' }
          }
        }
      }
    });
  });
});
