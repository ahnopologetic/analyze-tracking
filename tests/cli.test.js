const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const _ = require('lodash');

const CLI_PATH = path.join(__dirname, '..', 'bin', 'cli.js');

// Helper function to run CLI and capture output
function runCLI(targetDir, customFunction, outputFile) {
  const command = `node --no-warnings=ExperimentalWarning "${CLI_PATH}" "${targetDir}" --customFunction "${customFunction}" --output "${outputFile}"`;
  try {
    execSync(command, { encoding: 'utf8' });
    return true;
  } catch (error) {
    console.error(`CLI command failed: ${error.message}`);
    return false;
  }
}

// Helper function to compare YAML files ignoring order
function compareYAMLFiles(actualPath, expectedPath) {
  const actualContent = fs.readFileSync(actualPath, 'utf8');
  const expectedContent = fs.readFileSync(expectedPath, 'utf8');
  
  // Remove the YAML language server comment from both files
  const actualYAML = actualContent.replace(/^# yaml-language-server:.*\n/, '');
  const expectedYAML = expectedContent.replace(/^# yaml-language-server:.*\n/, '');
  
  // Parse YAML
  const actual = yaml.load(actualYAML);
  const expected = yaml.load(expectedYAML);
  
  // Compare version
  assert.strictEqual(actual.version, expected.version);
  
  // Compare source (ignoring dynamic fields like commit and timestamp)
  assert.ok(actual.source);
  assert.ok(actual.source.repository);
  
  // Compare events using deep equality (order-insensitive)
  assert.ok(_.isEqual(actual.events, expected.events), 
    'Events do not match. Actual: ' + JSON.stringify(actual.events, null, 2) + 
    '\nExpected: ' + JSON.stringify(expected.events, null, 2));
}

test.describe('CLI End-to-End Tests', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const tempDir = path.join(__dirname, 'temp');
  
  // Create temp directory before tests
  test.before(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
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
  
  test('should analyze Go files and generate a tracking schema', async () => {
    const targetDir = path.join(fixturesDir, 'go');
    const outputFile = path.join(tempDir, 'tracking-schema-go-test.yaml');
    const expectedFile = path.join(fixturesDir, 'go', 'tracking-schema-go.yaml');
    
    // Run CLI
    const success = runCLI(targetDir, 'customTrackFunction', outputFile);
    assert.ok(success, 'CLI should run successfully');
    
    // Check output file exists
    assert.ok(fs.existsSync(outputFile), 'Output file should be created');
    
    // Compare YAML files
    compareYAMLFiles(outputFile, expectedFile);
  });
  
  test('should analyze JavaScript files and generate a tracking schema', async () => {
    const targetDir = path.join(fixturesDir, 'javascript');
    const outputFile = path.join(tempDir, 'tracking-schema-javascript-test.yaml');
    const expectedFile = path.join(fixturesDir, 'javascript', 'tracking-schema-javascript.yaml');
    
    // Run CLI
    const success = runCLI(targetDir, 'customTrackFunction', outputFile);
    assert.ok(success, 'CLI should run successfully');
    
    // Check output file exists
    assert.ok(fs.existsSync(outputFile), 'Output file should be created');
    
    // Compare YAML files
    compareYAMLFiles(outputFile, expectedFile);
  });
  
  test('should analyze TypeScript files and generate a tracking schema', async () => {
    const targetDir = path.join(fixturesDir, 'typescript');
    const outputFile = path.join(tempDir, 'tracking-schema-typescript-test.yaml');
    const expectedFile = path.join(fixturesDir, 'typescript', 'tracking-schema-typescript.yaml');
    
    // Run CLI
    const success = runCLI(targetDir, 'customTrackFunction', outputFile);
    assert.ok(success, 'CLI should run successfully');
    
    // Check output file exists
    assert.ok(fs.existsSync(outputFile), 'Output file should be created');
    
    // Compare YAML files
    compareYAMLFiles(outputFile, expectedFile);
  });
  
  test('should analyze Python files and generate a tracking schema', async () => {
    const targetDir = path.join(fixturesDir, 'python');
    const outputFile = path.join(tempDir, 'tracking-schema-python-test.yaml');
    const expectedFile = path.join(fixturesDir, 'python', 'tracking-schema-python.yaml');
    
    // Run CLI
    const success = runCLI(targetDir, 'customTrackFunction', outputFile);
    assert.ok(success, 'CLI should run successfully');
    
    // Check output file exists
    assert.ok(fs.existsSync(outputFile), 'Output file should be created');
    
    // Compare YAML files
    compareYAMLFiles(outputFile, expectedFile);
  });
  
  test('should analyze Ruby files and generate a tracking schema', async () => {
    const targetDir = path.join(fixturesDir, 'ruby');
    const outputFile = path.join(tempDir, 'tracking-schema-ruby-test.yaml');
    const expectedFile = path.join(fixturesDir, 'ruby', 'tracking-schema-ruby.yaml');
    
    // Run CLI
    const success = runCLI(targetDir, 'customTrackFunction', outputFile);
    assert.ok(success, 'CLI should run successfully');
    
    // Check output file exists
    assert.ok(fs.existsSync(outputFile), 'Output file should be created');
    
    // Compare YAML files
    compareYAMLFiles(outputFile, expectedFile);
  });
  
  test('should handle empty files and generate an empty tracking schema', async () => {
    // Test with each language's empty file
    const languages = ['go', 'javascript', 'typescript', 'python', 'ruby'];
    
    for (const lang of languages) {
      const targetDir = path.join(fixturesDir, lang);
      const outputFile = path.join(tempDir, `tracking-schema-${lang}-empty-test.yaml`);
      
      // Check if empty file exists for this language
      const emptyFile = fs.readdirSync(targetDir).find(f => f.startsWith('empty.'));
      if (emptyFile) {
        // Create a temp directory with only the empty file
        const tempLangDir = path.join(tempDir, `${lang}-empty`);
        fs.mkdirSync(tempLangDir, { recursive: true });
        fs.copyFileSync(
          path.join(targetDir, emptyFile),
          path.join(tempLangDir, emptyFile)
        );
        
        // Run CLI on the directory with only the empty file
        const success = runCLI(tempLangDir, 'customTrackFunction', outputFile);
        assert.ok(success, `CLI should run successfully for ${lang} empty file`);
        
        // Check output file exists
        assert.ok(fs.existsSync(outputFile), 'Output file should be created');
        
        // Load the generated YAML
        const generatedContent = fs.readFileSync(outputFile, 'utf8');
        const generated = yaml.load(generatedContent.replace(/^# yaml-language-server:.*\n/, ''));
        
        // Check that events object is empty or has no events
        assert.ok(
          !generated.events || Object.keys(generated.events).length === 0,
          `${lang} empty file should produce no events`
        );
        
        // Clean up temp language directory
        fs.rmSync(tempLangDir, { recursive: true, force: true });
      }
    }
  });
  
  test('should analyze all languages together and generate a combined tracking schema', async () => {
    const targetDir = fixturesDir; // Use entire fixtures directory
    const outputFile = path.join(tempDir, 'tracking-schema-all-test.yaml');
    const expectedFile = path.join(fixturesDir, 'tracking-schema-all.yaml');
    
    // Run CLI
    const success = runCLI(targetDir, 'customTrackFunction', outputFile);
    assert.ok(success, 'CLI should run successfully');
    
    // Check output file exists
    assert.ok(fs.existsSync(outputFile), 'Output file should be created');
    
    // Compare YAML files
    compareYAMLFiles(outputFile, expectedFile);
  });
});
