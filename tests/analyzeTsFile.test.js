const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const ts = require('typescript');
const { analyzeTsFile } = require('../src/analyze/analyzeTsFile');

test.describe('analyzeTsFile', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const testFilePath = path.join(fixturesDir, 'typescript', 'main.ts');
  
  // Helper function to create TypeScript program
  function createProgram(filePath) {
    const options = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      lib: ['lib.es2022.d.ts'],
      allowJs: false,
      strict: true
    };
    
    return ts.createProgram([filePath], options);
  }
  
  test('should correctly analyze TypeScript file with multiple tracking providers', () => {
    const customFunction = 'customTrackFunction';
    const program = createProgram(testFilePath);
    const events = analyzeTsFile(testFilePath, program, customFunction);
    
    // Sort events by line number for consistent ordering
    events.sort((a, b) => a.line - b.line);
    
    assert.strictEqual(events.length, 12);
    
    // Test Google Analytics event
    const gaEvent = events.find(e => e.eventName === 'order_completed' && e.source === 'googleanalytics');
    assert.ok(gaEvent);
    assert.strictEqual(gaEvent.source, 'googleanalytics');
    assert.strictEqual(gaEvent.functionName, 'trackOrderCompletedGA');
    assert.strictEqual(gaEvent.line, 104);
    assert.deepStrictEqual(gaEvent.properties, {
      order_id: { type: 'string' },
      products: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            sku: { type: 'string | undefined' }
          }
        }
      },
      order_total: { type: 'number' },
      location: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string | undefined' }
        }
      },
      currency: { type: 'string' }
    });
    
    // Test Segment event
    const segmentEvent = events.find(e => e.eventName === 'user_checkout');
    assert.ok(segmentEvent);
    assert.strictEqual(segmentEvent.source, 'segment');
    assert.strictEqual(segmentEvent.functionName, 'checkout');
    assert.strictEqual(segmentEvent.line, 120);
    assert.deepStrictEqual(segmentEvent.properties, {
      stage: { type: 'string' },
      method: { type: 'string' },
      item_count: { type: 'number' }
    });
    
    // Test Mixpanel event
    const mixpanelEvent = events.find(e => e.eventName === 'purchase_confirmed');
    assert.ok(mixpanelEvent);
    assert.strictEqual(mixpanelEvent.source, 'mixpanel');
    assert.strictEqual(mixpanelEvent.functionName, 'confirmPurchaseMixpanel');
    assert.strictEqual(mixpanelEvent.line, 129);
    assert.deepStrictEqual(mixpanelEvent.properties, {
      order_id: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            sku: { type: 'string | undefined' }
          }
        }
      },
      total_amount: { type: 'number' }
    });
    
    // Test Amplitude event
    const amplitudeEvent = events.find(e => e.eventName === 'checkout_initiated' && e.source === 'amplitude');
    assert.ok(amplitudeEvent);
    assert.strictEqual(amplitudeEvent.source, 'amplitude');
    assert.strictEqual(amplitudeEvent.functionName, 'checkout');
    assert.strictEqual(amplitudeEvent.line, 134);
    assert.deepStrictEqual(amplitudeEvent.properties, {
      order_id: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            sku: { type: 'string | undefined' }
          }
        }
      },
      order_total: { type: 'number' },
      location: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string | undefined' }
        }
      },
      coupon_code: { type: 'null' }
    });
    
    // Test Rudderstack event
    const rudderstackEvent = events.find(e => e.eventName === 'order_finalized');
    assert.ok(rudderstackEvent);
    assert.strictEqual(rudderstackEvent.source, 'rudderstack');
    assert.strictEqual(rudderstackEvent.functionName, 'checkout');
    assert.strictEqual(rudderstackEvent.line, 149);
    assert.deepStrictEqual(rudderstackEvent.properties, {
      order_id: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            sku: { type: 'string | undefined' }
          }
        }
      },
      revenue: { type: 'number' },
      location: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string | undefined' }
        }
      }
    });
    
    // Test mParticle event
    const mparticleEvent = events.find(e => e.eventName === 'BuyNow');
    assert.ok(mparticleEvent);
    assert.strictEqual(mparticleEvent.source, 'mparticle');
    assert.strictEqual(mparticleEvent.functionName, 'checkout2');
    assert.strictEqual(mparticleEvent.line, 175);
    assert.deepStrictEqual(mparticleEvent.properties, {
      order_id: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            sku: { type: 'string | undefined' }
          }
        }
      },
      total: { type: 'number' },
      location: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string | undefined' }
        }
      }
    });
    
    // Test PostHog event
    const posthogEvent = events.find(e => e.eventName === 'user_action');
    assert.ok(posthogEvent);
    assert.strictEqual(posthogEvent.source, 'posthog');
    assert.strictEqual(posthogEvent.functionName, 'checkout2');
    assert.strictEqual(posthogEvent.line, 194);
    assert.deepStrictEqual(posthogEvent.properties, {
      order_id: { type: 'string' },
      retry: { type: 'number' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            sku: { type: 'string | undefined' }
          }
        }
      },
      amount: { type: 'number' },
      shipping: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string | undefined' }
        }
      }
    });
    
    // Test Pendo event
    const pendoEvent = events.find(e => e.eventName === 'customer_checkout');
    assert.ok(pendoEvent);
    assert.strictEqual(pendoEvent.source, 'pendo');
    assert.strictEqual(pendoEvent.functionName, 'checkout3');
    assert.strictEqual(pendoEvent.line, 215);
    assert.deepStrictEqual(pendoEvent.properties, {
      order_id: { type: 'string' },
      products: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            sku: { type: 'string | undefined' }
          }
        }
      },
      subtotal: { type: 'number' },
      address: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string | undefined' }
        }
      }
    });
    
    // Test Heap event
    const heapEvent = events.find(e => e.eventName === 'user_login');
    assert.ok(heapEvent);
    assert.strictEqual(heapEvent.source, 'heap');
    assert.strictEqual(heapEvent.functionName, 'checkout3');
    assert.strictEqual(heapEvent.line, 229);
    assert.deepStrictEqual(heapEvent.properties, {
      user_id: { type: 'string' },
      email: { type: 'string' },
      name: { type: 'string' },
      roles: {
        type: 'array',
        items: { type: 'string' }
      }
    });
    
    // Test Snowplow events
    const snowplowEvent1 = events.find(e => e.eventName === 'item_view');
    assert.ok(snowplowEvent1);
    assert.strictEqual(snowplowEvent1.source, 'snowplow');
    assert.strictEqual(snowplowEvent1.functionName, 'trackSnowplow');
    assert.strictEqual(snowplowEvent1.line, 246);
    assert.deepStrictEqual(snowplowEvent1.properties, {
      category: { type: 'string' },
      label: { type: 'string' },
      property: { type: 'string' },
      value: { type: 'number' }
    });
    
    const snowplowEvent2 = events.find(e => e.eventName === 'button_click');
    assert.ok(snowplowEvent2);
    assert.strictEqual(snowplowEvent2.source, 'snowplow');
    assert.strictEqual(snowplowEvent2.functionName, 'trackSnowplow2');
    assert.strictEqual(snowplowEvent2.line, 250);
    
    // Test custom function event
    const customEvent = events.find(e => e.eventName === 'custom_event_v2');
    assert.ok(customEvent);
    assert.strictEqual(customEvent.source, 'custom');
    assert.strictEqual(customEvent.functionName, 'global');
    assert.strictEqual(customEvent.line, 279);
    assert.deepStrictEqual(customEvent.properties, {
      order_id: { type: 'string' },
      value: { type: 'number' },
      list: {
        type: 'array',
        items: { type: 'string' }
      },
      metadata: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          retry: { type: 'boolean' }
        }
      }
    });
  });
  
  test('should handle files without tracking events', () => {
    const emptyTestFile = path.join(fixturesDir, 'typescript', 'empty.ts');
    // Create empty file for testing
    const fs = require('fs');
    if (!fs.existsSync(emptyTestFile)) {
      fs.writeFileSync(emptyTestFile, '// Empty file\n');
    }
    
    const program = createProgram(emptyTestFile);
    const events = analyzeTsFile(emptyTestFile, program, 'customTrack');
    assert.deepStrictEqual(events, []);
  });
  
  test('should handle missing custom function', () => {
    const program = createProgram(testFilePath);
    const events = analyzeTsFile(testFilePath, program, null);
    
    // Should find all events except the custom one
    assert.strictEqual(events.length, 11);
    assert.strictEqual(events.find(e => e.source === 'custom'), undefined);
  });
  
  test('should handle nested property types correctly', () => {
    const customFunction = 'customTrackFunction';
    const program = createProgram(testFilePath);
    const events = analyzeTsFile(testFilePath, program, customFunction);
    
    // Test nested object properties with interfaces expanded
    const eventWithNestedObj = events.find(e => e.properties.location);
    assert.ok(eventWithNestedObj);
    assert.deepStrictEqual(eventWithNestedObj.properties.location, {
      type: 'object',
      properties: {
        city: { type: 'string' },
        state: { type: 'string' },
        postalCode: { type: 'string | undefined' }
      }
    });
    
    // Test array properties with interface expansion
    const eventWithArray = events.find(e => e.properties.items);
    assert.ok(eventWithArray);
    assert.deepStrictEqual(eventWithArray.properties.items, {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
          sku: { type: 'string | undefined' }
        }
      }
    });
  });
  
  test('should detect and expand interface types correctly', () => {
    const customFunction = 'customTrackFunction';
    const program = createProgram(testFilePath);
    const events = analyzeTsFile(testFilePath, program, customFunction);
    
    // Test that Address interface is expanded
    const eventWithAddress = events.find(e => e.properties.address || e.properties.location);
    assert.ok(eventWithAddress);
    const addressProp = eventWithAddress.properties.address || eventWithAddress.properties.location;
    assert.strictEqual(addressProp.type, 'object');
    assert.ok(addressProp.properties);
    assert.strictEqual(addressProp.properties.city.type, 'string');
    assert.strictEqual(addressProp.properties.state.type, 'string');
    assert.strictEqual(addressProp.properties.postalCode.type, 'string | undefined');
    
    // Test that Product interface is expanded in arrays
    const eventWithProducts = events.find(e => e.properties.items || e.properties.products);
    assert.ok(eventWithProducts);
    const productsProp = eventWithProducts.properties.items || eventWithProducts.properties.products;
    assert.strictEqual(productsProp.type, 'array');
    assert.strictEqual(productsProp.items.type, 'object');
    assert.ok(productsProp.items.properties);
    assert.strictEqual(productsProp.items.properties.id.type, 'string');
    assert.strictEqual(productsProp.items.properties.name.type, 'string');
    assert.strictEqual(productsProp.items.properties.price.type, 'number');
    assert.strictEqual(productsProp.items.properties.sku.type, 'string | undefined');
  });
  
  test('should handle shorthand property assignments correctly', () => {
    const customFunction = 'customTrackFunction';
    const program = createProgram(testFilePath);
    const events = analyzeTsFile(testFilePath, program, customFunction);
    
    // Test that shorthand 'items' property is correctly expanded
    const mixpanelEvent = events.find(e => e.eventName === 'purchase_confirmed');
    assert.ok(mixpanelEvent);
    assert.ok(mixpanelEvent.properties.items);
    assert.strictEqual(mixpanelEvent.properties.items.type, 'array');
    assert.strictEqual(mixpanelEvent.properties.items.items.type, 'object');
    assert.ok(mixpanelEvent.properties.items.items.properties);
  });
  
  test('should handle variable references correctly', () => {
    const customFunction = 'customTrackFunction';
    const program = createProgram(testFilePath);
    const events = analyzeTsFile(testFilePath, program, customFunction);
    
    // Test that variable references like segmentProps are resolved
    const segmentEvent = events.find(e => e.eventName === 'user_checkout');
    assert.ok(segmentEvent);
    assert.deepStrictEqual(segmentEvent.properties, {
      stage: { type: 'string' },
      method: { type: 'string' },
      item_count: { type: 'number' }
    });
  });
  
  test('should exclude action field from Snowplow properties', () => {
    const customFunction = 'customTrackFunction';
    const program = createProgram(testFilePath);
    const events = analyzeTsFile(testFilePath, program, customFunction);
    
    const snowplowEvent = events.find(e => e.source === 'snowplow');
    assert.ok(snowplowEvent);
    // action field should not be in properties since it's used as event name
    assert.strictEqual(snowplowEvent.properties.action, undefined);
    assert.ok(snowplowEvent.properties.category);
  });
  
  test('should handle mParticle three-parameter format', () => {
    const customFunction = 'customTrackFunction';
    const program = createProgram(testFilePath);
    const events = analyzeTsFile(testFilePath, program, customFunction);
    
    const mparticleEvent = events.find(e => e.source === 'mparticle');
    assert.ok(mparticleEvent);
    assert.strictEqual(mparticleEvent.eventName, 'BuyNow');
    // Event name is first param, properties are third param
    assert.ok(mparticleEvent.properties.order_id);
  });
  
  test('should handle readonly array types correctly', () => {
    const customFunction = 'customTrackFunction';
    const program = createProgram(testFilePath);
    const events = analyzeTsFile(testFilePath, program, customFunction);
    
    // Test ReadonlyArray<Product> in checkout3
    const pendoEvent = events.find(e => e.eventName === 'customer_checkout');
    assert.ok(pendoEvent);
    assert.strictEqual(pendoEvent.properties.products.type, 'array');
    assert.strictEqual(pendoEvent.properties.products.items.type, 'object');
    assert.ok(pendoEvent.properties.products.items.properties);
    assert.strictEqual(pendoEvent.properties.products.items.properties.id.type, 'string');
  });
  
  test('should handle exported vs non-exported interfaces', () => {
    const customFunction = 'customTrackFunction';
    const program = createProgram(testFilePath);
    const events = analyzeTsFile(testFilePath, program, customFunction);
    
    // Both exported Product and non-exported Address should be expanded
    const eventWithBoth = events.find(e => e.properties.items && e.properties.location);
    assert.ok(eventWithBoth);
    
    // Check exported Product interface
    assert.ok(eventWithBoth.properties.items.items.properties);
    
    // Check non-exported Address interface
    assert.ok(eventWithBoth.properties.location.properties);
  });
});
