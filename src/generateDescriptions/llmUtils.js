/**
 * @fileoverview LLM integration utilities for generating structured responses
 * @module analyze-tracking/generateDescriptions/llmUtils
 */

const { PromptTemplate } = require('@langchain/core/prompts');

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
    console.error('Error during LLM response parsing:', error.message);
    return null;
  }
}

module.exports = {
  sendPromptToLLM
};
