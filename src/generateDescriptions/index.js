/**
 * @fileoverview AI-powered description generator for analytics events
 * @module analyze-tracking/generateDescriptions
 */

const { createPrompt } = require('./promptUtils');
const { createEventDescriptionSchema } = require('./schemaUtils');
const { sendPromptToLLM } = require('./llmUtils');

async function generateEventDescription(eventName, event, codebaseDir, model) {
  const properties = event.properties || {};
  const implementations = event.implementations || [];

  // Create prompt for the LLM
  const prompt = createPrompt(eventName, properties, implementations, codebaseDir);

  // Define the output schema using Zod
  const eventDescriptionSchema = createEventDescriptionSchema(properties);

  // Send prompt to the LLM and get the structured response
  const result = await sendPromptToLLM(prompt, eventDescriptionSchema, model);

  return { eventName, descriptions: result?.descriptions || null };
}

async function generateDescriptions(events, codebaseDir, model) {
  const eventPromises = Object.entries(events).map(([eventName, event]) =>
    generateEventDescription(eventName, event, codebaseDir, model)
  );

  console.info(`Running ${eventPromises.length} prompts in parallel...`);

  const results = await Promise.all(eventPromises);

  // Process results and update the events object
  results.forEach(({ eventName, descriptions }) => {
    if (descriptions) {
      const event = events[eventName];
      event.description = descriptions.eventDescription;

      // Update property descriptions recursively
      function updatePropertyDescriptions(eventProperties, descriptionProperties) {
        for (const propName in descriptionProperties) {
          if (eventProperties[propName]) {
            eventProperties[propName].description = descriptionProperties[propName].description;
            if (eventProperties[propName].properties && descriptionProperties[propName].properties) {
              updatePropertyDescriptions(
                eventProperties[propName].properties,
                descriptionProperties[propName].properties
              );
            }
          }
        }
      }

      updatePropertyDescriptions(event.properties, descriptions.properties);

      // Update implementations with descriptions
      for (let i = 0; i < descriptions.implementations.length; i++) {
        if (event.implementations[i]) {
          if (
            event.implementations[i].path === descriptions.implementations[i].path &&
            event.implementations[i].line === descriptions.implementations[i].line
          ) {
            event.implementations[i].description = descriptions.implementations[i].description;
          } else {
            console.error(`Returned implementation description does not match path or line for event: ${eventName}`);
          }
        }
      }
    } else {
      console.error(`Failed to get description for event: ${eventName}`);
    }
  });

  return events;
}

module.exports = {
  generateDescriptions
};
