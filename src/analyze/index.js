/**
 * @fileoverview Directory analyzer for detecting analytics tracking across multiple programming languages
 * @module analyze-tracking/analyze
 */

const path = require('path');
const ts = require('typescript');
const { getAllFiles } = require('../utils/fileProcessor');
const { analyzeJsFile } = require('./javascript');
const { analyzeTsFile } = require('./typescript');
const { analyzePythonFile } = require('./python');
const { analyzeRubyFile } = require('./ruby');
const { analyzeGoFile } = require('./go');

async function analyzeDirectory(dirPath, customFunction) {
  const allEvents = {};

  const files = getAllFiles(dirPath);
  const tsFiles = files.filter(file => /\.(tsx?)$/.test(file));
  const tsProgram = ts.createProgram(tsFiles, {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.CommonJS,
  });

  for (const file of files) {
    let events = [];

    const isJsFile = /\.(jsx?)$/.test(file);
    const isTsFile = /\.(tsx?)$/.test(file);
    const isPythonFile = /\.(py)$/.test(file);
    const isRubyFile = /\.(rb)$/.test(file);
    const isGoFile = /\.(go)$/.test(file);

    if (isJsFile) {
      events = analyzeJsFile(file, customFunction);
    } else if (isTsFile) {
      events = analyzeTsFile(file, tsProgram, customFunction);
    } else if (isPythonFile) {
      events = await analyzePythonFile(file, customFunction);
    } else if (isRubyFile) {
      events = await analyzeRubyFile(file, customFunction);
    } else if (isGoFile) {
      events = await analyzeGoFile(file, customFunction);
    } else {
      continue;
    }

    events.forEach((event) => {
      const relativeFilePath = path.relative(dirPath, event.filePath);

      if (!allEvents[event.eventName]) {
        allEvents[event.eventName] = {
          implementations: [{
            path: relativeFilePath,
            line: event.line,
            function: event.functionName,
            destination: event.source
          }],
          properties: event.properties,
        };
      } else {
        allEvents[event.eventName].implementations.push({
          path: relativeFilePath,
          line: event.line,
          function: event.functionName,
          destination: event.source
        });

        allEvents[event.eventName].properties = {
          ...allEvents[event.eventName].properties,
          ...event.properties,
        };
      }
    });
  }

  return allEvents;
}

module.exports = { analyzeDirectory };
