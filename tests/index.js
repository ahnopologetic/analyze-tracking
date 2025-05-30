const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Dynamically find all test files
const testFiles = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.test.js'))
  .map(file => path.join(__dirname, file));

console.log('Running tests...\n');
console.log('Found test files:', testFiles.map(f => path.basename(f)).join(', '), '\n');

// Run all tests with flag for WASM support
const tests = spawn('node', [
  '--no-warnings=ExperimentalWarning',
  '--experimental-vm-modules',
  '--test',
  ...testFiles
], {
  stdio: 'inherit'
});

tests.on('close', (code) => {
  process.exit(code);
});
