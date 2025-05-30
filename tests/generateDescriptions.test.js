const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Mock getCodeSnippet before loading any modules that use it
const mockGetCodeSnippet = () => {
  return '// Mock code snippet\nfunction trackEvent() {\n  // Implementation\n}';
};

// Clear require cache for modules we need to mock
delete require.cache[require.resolve('../src/generateDescriptions/promptUtils.js')];
delete require.cache[require.resolve('../src/generateDescriptions')];
delete require.cache[require.resolve('../src/generateDescriptions/index.js')];

// Mock the promptUtils module before it's used
const promptUtilsPath = require.resolve('../src/generateDescriptions/promptUtils.js');
const originalPromptUtils = require(promptUtilsPath);
originalPromptUtils.getCodeSnippet = mockGetCodeSnippet;

// Now load generateDescriptions which will use our mocked function
const { generateDescriptions } = require('../src/generateDescriptions');

// Mock LLM class that mimics langchain's structure
class FakeChatModel {
  constructor(options = {}) {
    this.options = options;
    this.structured = false;
  }

  withStructuredOutput(schema) {
    // Return a new instance that knows it should output structured data
    const structuredModel = new FakeChatModel(this.options);
    structuredModel.structured = true;
    structuredModel.schema = schema;
    return structuredModel;
  }

  async invoke(messages) {
    // Parse the prompt to extract event name and generate fake descriptions
    const promptText = messages.toString();
    const eventNameMatch = promptText.match(/Event Name: "([^"]+)"/);
    const eventName = eventNameMatch ? eventNameMatch[1] : 'unknown_event';
    
    // Extract properties from the prompt
    const propertiesSection = promptText.match(/Properties:([\s\S]*?)Implementations:/);
    let properties = {};
    
    if (propertiesSection) {
      const propLines = propertiesSection[1].trim().split('\n');
      
      // Parse properties recursively to handle nested structure
      const parseProperties = (lines, currentIndent = '') => {
        const result = {};
        let i = 0;
        
        while (i < lines.length) {
          const line = lines[i];
          
          // Match property at current indent level
          const propMatch = line.match(new RegExp(`^${currentIndent}- "([^"]+)" \\(type: ([^)]+)\\)`));
          if (propMatch) {
            const propName = propMatch[1];
            result[propName] = {
              description: `Description for ${propName} property`
            };
            
            // Check if next line indicates sub-properties
            if (i + 1 < lines.length && lines[i + 1].includes('Sub-properties:')) {
              i += 2; // Skip sub-properties header
              
              // Find all sub-property lines
              const subPropLines = [];
              const subIndent = currentIndent + '    ';
              
              while (i < lines.length && lines[i].startsWith(subIndent)) {
                subPropLines.push(lines[i]);
                i++;
              }
              
              // Parse sub-properties recursively
              result[propName].properties = parseProperties(subPropLines, subIndent);
              i--; // Back up one since we went too far
            }
          }
          i++;
        }
        
        return result;
      };
      
      properties = parseProperties(propLines);
    }

    // Extract implementations from the prompt
    const implementationsSection = promptText.match(/Implementations:([\s\S]*)/);
    const implementations = [];
    
    if (implementationsSection) {
      const implLines = implementationsSection[1].trim().split('\n');
      let currentImpl = null;
      
      implLines.forEach(line => {
        const implMatch = line.match(/- Path: "([^"]+)", Line: (\d+), Function: "([^"]+)", Destination: "([^"]+)"/);
        if (implMatch) {
          currentImpl = {
            path: implMatch[1],
            line: parseInt(implMatch[2]),
            description: `Action that ${eventName.replace(/_/g, ' ')} occurs`
          };
          implementations.push(currentImpl);
        }
      });
    }

    // Return structured response based on the schema
    return {
      eventDescription: `Description for ${eventName.replace(/_/g, ' ')} event`,
      properties: properties,
      implementations: implementations
    };
  }
}

test.describe('generateDescriptions Tests', () => {
  const tempDir = path.join(__dirname, 'temp-descriptions');
  const fixturesDir = path.join(__dirname, 'fixtures');
  
  // Create temp directory before tests
  test.before(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });
  
  // Clean up temp directory after tests
  test.after(() => {
    if (fs.existsSync(tempDir)) {
      fs.readdirSync(tempDir).forEach(file => {
        fs.unlinkSync(path.join(tempDir, file));
      });
      fs.rmdirSync(tempDir);
    }
  });

  test('should generate descriptions for simple event', async () => {
    const mockModel = new FakeChatModel();
    
    const events = {
      page_viewed: {
        properties: {
          page_name: { type: 'string' },
          page_url: { type: 'string' }
        },
        implementations: [
          {
            path: 'src/pages/home.js',
            line: 42,
            function: 'trackPageView',
            destination: 'segment'
          }
        ]
      }
    };

    const result = await generateDescriptions(events, fixturesDir, mockModel);
    
    // Check that descriptions were added
    assert.ok(result.page_viewed.description, 'Event should have a description');
    assert.strictEqual(result.page_viewed.description, 'Description for page viewed event');
    
    // Check property descriptions
    assert.ok(result.page_viewed.properties.page_name.description, 'page_name should have a description');
    assert.ok(result.page_viewed.properties.page_url.description, 'page_url should have a description');
    
    // Check implementation descriptions
    assert.ok(result.page_viewed.implementations[0].description, 'Implementation should have a description');
    assert.strictEqual(result.page_viewed.implementations[0].description, 'Action that page viewed occurs');
  });

  test('should handle nested properties', async () => {
    const mockModel = new FakeChatModel();
    
    const events = {
      product_purchased: {
        properties: {
          product: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' }
            }
          },
          quantity: { type: 'number' }
        },
        implementations: [
          {
            path: 'src/checkout/complete.js',
            line: 123,
            function: 'trackPurchase',
            destination: 'amplitude'
          }
        ]
      }
    };

    const result = await generateDescriptions(events, fixturesDir, mockModel);
    
    // Check nested property descriptions
    assert.ok(result.product_purchased.properties.product.description, 'product should have a description');
    assert.ok(result.product_purchased.properties.product.properties.id.description, 'product.id should have a description');
    assert.ok(result.product_purchased.properties.product.properties.name.description, 'product.name should have a description');
    assert.ok(result.product_purchased.properties.product.properties.price.description, 'product.price should have a description');
  });

  test('should handle multiple events', async () => {
    const mockModel = new FakeChatModel();
    
    const events = {
      user_signed_up: {
        properties: {
          user_id: { type: 'string' },
          email: { type: 'string' }
        },
        implementations: [
          {
            path: 'src/auth/signup.js',
            line: 45,
            function: 'trackSignup',
            destination: 'mixpanel'
          }
        ]
      },
      user_logged_in: {
        properties: {
          user_id: { type: 'string' },
          method: { type: 'string' }
        },
        implementations: [
          {
            path: 'src/auth/login.js',
            line: 78,
            function: 'trackLogin',
            destination: 'mixpanel'
          }
        ]
      }
    };

    const result = await generateDescriptions(events, fixturesDir, mockModel);
    
    // Check both events have descriptions
    assert.ok(result.user_signed_up.description, 'user_signed_up should have a description');
    assert.ok(result.user_logged_in.description, 'user_logged_in should have a description');
    
    // Check properties for both events
    assert.ok(result.user_signed_up.properties.user_id.description, 'user_signed_up.user_id should have a description');
    assert.ok(result.user_logged_in.properties.method.description, 'user_logged_in.method should have a description');
  });

  test('should handle events with multiple implementations', async () => {
    const mockModel = new FakeChatModel();
    
    const events = {
      button_clicked: {
        properties: {
          button_id: { type: 'string' },
          button_text: { type: 'string' }
        },
        implementations: [
          {
            path: 'src/components/Header.js',
            line: 34,
            function: 'trackButtonClick',
            destination: 'segment'
          },
          {
            path: 'src/components/Footer.js',
            line: 89,
            function: 'trackButtonClick',
            destination: 'segment'
          },
          {
            path: 'src/pages/product.js',
            line: 156,
            function: 'trackCTA',
            destination: 'amplitude'
          }
        ]
      }
    };

    const result = await generateDescriptions(events, fixturesDir, mockModel);
    
    // Check all implementations have descriptions
    assert.strictEqual(result.button_clicked.implementations.length, 3, 'Should have 3 implementations');
    result.button_clicked.implementations.forEach((impl, index) => {
      assert.ok(impl.description, `Implementation ${index} should have a description`);
      assert.strictEqual(impl.description, 'Action that button clicked occurs');
    });
  });

  test('should handle events with no properties', async () => {
    const mockModel = new FakeChatModel();
    
    const events = {
      app_opened: {
        properties: {},
        implementations: [
          {
            path: 'src/App.js',
            line: 12,
            function: 'trackAppOpen',
            destination: 'posthog'
          }
        ]
      }
    };

    const result = await generateDescriptions(events, fixturesDir, mockModel);
    
    // Check event still gets a description
    assert.ok(result.app_opened.description, 'Event without properties should still have a description');
    assert.ok(result.app_opened.implementations[0].description, 'Implementation should have a description');
  });

  test('should handle LLM errors gracefully', async () => {
    // Create a mock model that throws an error
    const errorModel = {
      withStructuredOutput: () => ({
        invoke: async () => {
          throw new Error('LLM API error');
        }
      })
    };
    
    const events = {
      test_event: {
        properties: {
          test_prop: { type: 'string' }
        },
        implementations: [
          {
            path: 'src/test.js',
            line: 1,
            function: 'test',
            destination: 'custom'
          }
        ]
      }
    };

    // Should not throw, but should log error
    const result = await generateDescriptions(events, fixturesDir, errorModel);
    
    // Event should remain unchanged when LLM fails
    assert.ok(!result.test_event.description, 'Event should not have description when LLM fails');
    assert.ok(!result.test_event.properties.test_prop.description, 'Property should not have description when LLM fails');
  });

  test('should maintain original event structure', async () => {
    const mockModel = new FakeChatModel();
    
    const events = {
      complex_event: {
        properties: {
          simple_prop: { type: 'string' },
          nested_prop: {
            type: 'object',
            properties: {
              inner_prop: { type: 'number' }
            }
          }
        },
        implementations: [
          {
            path: 'src/complex.js',
            line: 100,
            function: 'trackComplex',
            destination: 'rudderstack',
            // Extra fields that should be preserved
            extraField: 'should_be_preserved'
          }
        ],
        // Extra fields on event that should be preserved
        customField: 'preserve_this'
      }
    };

    const result = await generateDescriptions(events, fixturesDir, mockModel);
    
    // Check that original structure is maintained
    assert.strictEqual(result.complex_event.customField, 'preserve_this', 'Custom fields should be preserved');
    assert.strictEqual(result.complex_event.implementations[0].extraField, 'should_be_preserved', 'Extra implementation fields should be preserved');
    
    // Check that descriptions are added without breaking structure
    assert.ok(result.complex_event.description, 'Event should have description');
    assert.ok(result.complex_event.properties.simple_prop.description, 'Simple property should have description');
    assert.ok(result.complex_event.properties.nested_prop.description, 'Nested property should have description');
    assert.ok(result.complex_event.properties.nested_prop.properties.inner_prop.description, 'Inner property should have description');
  });
});
