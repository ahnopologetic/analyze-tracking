const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const { PromptTemplate } = require('@langchain/core/prompts');

function createPrompt(eventName, properties, implementations, codebaseDir) {
  let prompt = `Event Name: "${eventName}"\n\n`;
  prompt += `Properties:\n`;

  function appendPropertiesToPrompt(properties, indent = '') {
    for (const propName in properties) {
      const prop = properties[propName];
      prompt += `${indent}- "${propName}" (type: ${prop.type})\n`;
      if (prop.properties) {
        prompt += `${indent}  Sub-properties:\n`;
        appendPropertiesToPrompt(prop.properties, indent + '    ');
      }
    }
  }

  appendPropertiesToPrompt(properties);

  // Add implementations with code snippets
  prompt += `\nImplementations:\n`;
  for (const impl of implementations) {
    const codeSnippet = getCodeSnippet(path.join(codebaseDir, impl.path), impl.line);
    prompt += `- Path: "${impl.path}", Line: ${impl.line}, Function: "${impl.function}", Destination: "${impl.destination}"\n`;
    prompt += `Code Snippet:\n`;
    prompt += '```\n';
    prompt += codeSnippet + '\n';
    prompt += '```\n';
  }

  return prompt;
}

function getCodeSnippet(filePath, lineNumber, contextLines = 5) {
  // Extract a code snippet from the file around the specified line
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    const startLine = Math.max(0, lineNumber - contextLines - 1);
    const endLine = Math.min(lines.length, lineNumber + contextLines);

    const snippetLines = lines.slice(startLine, endLine);
    return snippetLines.join('\n');
  } catch (e) {
    console.error(`Failed to read file ${filePath}:`, e);
    return '';
  }
}

function createEventDescriptionSchema(properties) {
  function buildPropertySchema(prop) {
    if (prop.properties) {
      const subPropertiesSchema = {};
      for (const subPropName in prop.properties) {
        subPropertiesSchema[subPropName] = buildPropertySchema(prop.properties[subPropName]);
      }
      return z.object({
        description: z
          .string()
          .describe('A maximum of 10 words describing the property and what it means'),
        properties: z.object(subPropertiesSchema),
      });
    } else {
      return z.object({
        description: z
          .string()
          .describe('A maximum of 10 words describing the property and what it means'),
      });
    }
  }

  // Define the schema for properties
  const propertiesSchema = {};
  for (const propName in properties) {
    propertiesSchema[propName] = buildPropertySchema(properties[propName]);
  }

  // Define the schema for implementations
  const implementationsSchema = z.array(
    z.object({
      description: z
        .string()
        .describe('A maximum of 10 words describing how this event is triggered without using the word "triggered"'),
      path: z.string(),
      line: z.number(),
    })
  );

  // Construct the full schema
  const eventDescriptionSchema = z.object({
    eventDescription: z
      .string()
      .describe('A maximum of 10 words describing the event and what it tracks without using the word "tracks"'),
    properties: z.object(propertiesSchema),
    implementations: implementationsSchema,
  });

  return eventDescriptionSchema;
}

async function sendPromptToLLM(prompt, schema, model) {
  try {
    const promptTemplate = new PromptTemplate({
      template: `You are an expert at structured data extraction. Generate detailed descriptions for the following analytics event, its properties, and implementations.\n{input}`,
      inputVariables: ['input'],
    });

    const formattedPrompt = await promptTemplate.format({
      input: prompt,
    });

    const structuredModel = model.withStructuredOutput(schema);
    const response = await structuredModel.invoke(formattedPrompt);

    return {
      descriptions: response,
    };
  } catch (error) {
    console.error('Error during LLM response parsing:', error);
    return null;
  }
}

async function generateEventDescription(eventName, event, codebaseDir, model) {
  const properties = event.properties || {};
  const implementations = event.implementations || [];

  // Create prompt for the LLM
  const prompt = createPrompt(eventName, properties, implementations, codebaseDir);

  // Define the output schema using Zod
  const eventDescriptionSchema = createEventDescriptionSchema(properties);

  // Send prompt to the LLM and get the structured response
  const { descriptions } = await sendPromptToLLM(prompt, eventDescriptionSchema, model);

  return { eventName, descriptions };
}

async function generateDescriptions(events, codebaseDir, model) {
  const eventPromises = Object.entries(events).map(([eventName, event]) =>
    generateEventDescription(eventName, event, codebaseDir, model)
  );

  console.log(`Running ${eventPromises.length} prompts in parallel...`);

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

module.exports = { generateDescriptions };
