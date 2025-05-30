/**
 * @fileoverview Zod schema utilities for structuring event descriptions
 * @module analyze-tracking/generateDescriptions/schemaUtils
 */

const { z } = require('zod');

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

module.exports = {
  createEventDescriptionSchema
};
