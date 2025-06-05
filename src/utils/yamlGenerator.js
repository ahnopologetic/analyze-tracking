/**
 * @fileoverview YAML schema generator for analytics tracking events
 * @module analyze-tracking/utils/yamlGenerator
 */

const fs = require('fs');
const yaml = require('js-yaml');

const VERSION = 1
const SCHEMA_URL = "https://raw.githubusercontent.com/fliskdata/analyze-tracking/main/schema.json";

function generateYamlSchema(events, repository, outputPath, stdout = false) {
  const schema = {
    version: VERSION,
    source: repository,
    events,
  };
  const options = {
    noRefs: true,
    lineWidth: -1,
  };
  const yamlOutput = yaml.dump(schema, options);
  const yamlFile = `# yaml-language-server: $schema=${SCHEMA_URL}\n${yamlOutput}`;
  if (stdout) {
    process.stdout.write(yamlFile);
  } else {
    fs.writeFileSync(outputPath, yamlFile, 'utf8');
    console.log(`Tracking schema YAML file generated: ${outputPath}`);
  }
}

module.exports = { generateYamlSchema };
