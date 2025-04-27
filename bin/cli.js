#!/usr/bin/env node --no-warnings=ExperimentalWarning

const path = require('path');
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const { run } = require('../src/index');
const { helpContent } = require('./help');

const SUPPORTED_MODELS = {
  openai: ['gpt-4o-mini'],
  gemini: ['gemini-2.0-flash-lite-001'],
};

// Parse command-line arguments
const optionDefinitions = [
  {
    name: 'targetDir',
    type: String,
    defaultOption: true,
  },
  {
    name: 'generateDescription',
    alias: 'g',
    type: Boolean,
    defaultValue: false,
  },
  {
    name: 'provider',
    alias: 'p',
    type: String,
    defaultValue: 'openai',
  },
  {
    name: 'model',
    alias: 'm',
    type: String,
    defaultValue: 'gpt-4o-mini',
  },
  {
    name: 'output',
    alias: 'o',
    type: String,
    defaultValue: 'tracking-schema.yaml',
  },
  {
    name: 'customFunction',
    alias: 'c',
    type: String,
  },
  {
    name: 'repositoryUrl',
    alias: 'u',
    type: String,
  },
  {
    name: 'commitHash',
    alias: 's',
    type: String,
  },
  {
    name: 'commitTimestamp',
    alias: 't',
    type: String,
  },
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
  },
]
const options = commandLineArgs(optionDefinitions);
const {
  targetDir,
  generateDescription,
  provider,
  model,
  output,
  customFunction,
  repositoryUrl,
  commitHash,
  commitTimestamp,
  help,
} = options;

if (help) {
  console.log(commandLineUsage(helpContent));
  process.exit(0);
}

const customSourceDetails = {
  repositoryUrl,
  commitHash,
  commitTimestamp,
};

if (!targetDir) {
  console.error('Please provide the path to the repository.');
  console.log(commandLineUsage(helpContent));
  process.exit(1);
}

if (generateDescription) {
  if (!Object.keys(SUPPORTED_MODELS).includes(provider)) {
    console.error('Please provide a valid provider. Options: openai, gemini');
    process.exit(1);
  }

  if (provider === 'openai') {
    if (!SUPPORTED_MODELS.openai.includes(model)) {
      console.error(`Please provide a valid model for OpenAI. Options: ${SUPPORTED_MODELS.openai.join(', ')}`);
      process.exit(1);
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error('Please set the `OPENAI_API_KEY` environment variable to use OpenAI for `generateDescription`.');
      process.exit(1);
    }
  }
  
  if (provider === 'gemini') {
    if (!SUPPORTED_MODELS.gemini.includes(model)) {
      console.error(`Please provide a valid model for Gemini. Options: ${SUPPORTED_MODELS.gemini.join(', ')}`);
      process.exit(1);
    }
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.error('Please set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to use Gemini for `generateDescription`.');
      process.exit(1);
    }
  }
}

run(path.resolve(targetDir), output, customFunction, customSourceDetails, generateDescription, provider, model);
