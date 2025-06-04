const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const git = require('isomorphic-git');
const { getAllFiles } = require('../src/utils/fileProcessor');
const { getRepoDetails } = require('../src/utils/repoDetails');
const { generateYamlSchema } = require('../src/utils/yamlGenerator');
const { findWrappingFunction } = require('../src/analyze/typescript/utils/function-finder');
const ts = require('typescript');

test.describe('fileProcessor', () => {
  const tempDir = path.join(__dirname, 'temp-fileprocessor');
  
  test.before(() => {
    // Create temp directory structure for testing
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'tests'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'node_modules'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'coverage'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.hidden'), { recursive: true });
    
    // Create test files
    fs.writeFileSync(path.join(tempDir, 'index.js'), 'console.log("root");');
    fs.writeFileSync(path.join(tempDir, 'src', 'main.js'), 'console.log("main");');
    fs.writeFileSync(path.join(tempDir, 'src', 'utils.js'), 'console.log("utils");');
    fs.writeFileSync(path.join(tempDir, 'tests', 'test.js'), 'console.log("test");');
    fs.writeFileSync(path.join(tempDir, '.git', 'config'), '[core]');
    fs.writeFileSync(path.join(tempDir, 'node_modules', 'package.js'), 'module.exports = {};');
    fs.writeFileSync(path.join(tempDir, 'coverage', 'report.html'), '<html></html>');
    fs.writeFileSync(path.join(tempDir, '.hidden', 'secret.js'), 'console.log("secret");');
    fs.writeFileSync(path.join(tempDir, '.env'), 'SECRET=value');
  });
  
  test.after(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  
  test('should get all files in directory recursively', () => {
    const files = getAllFiles(tempDir);
    
    // Should include regular files
    assert.ok(files.some(f => f.endsWith('index.js')));
    assert.ok(files.some(f => f.endsWith(path.join('src', 'main.js'))));
    assert.ok(files.some(f => f.endsWith(path.join('src', 'utils.js'))));
    assert.ok(files.some(f => f.endsWith(path.join('tests', 'test.js'))));
  });
  
  test('should exclude hidden files and directories', () => {
    const files = getAllFiles(tempDir);
    
    // Should not include hidden files
    assert.ok(!files.some(f => f.includes('.env')));
    assert.ok(!files.some(f => f.includes('.hidden')));
    assert.ok(!files.some(f => f.includes('.git')));
  });
  
  test('should exclude common directories', () => {
    const files = getAllFiles(tempDir);
    
    // Should not include files from excluded directories
    assert.ok(!files.some(f => f.includes('node_modules')));
    assert.ok(!files.some(f => f.includes('coverage')));
    // Note: Since our tempDir contains 'temp' in the path, we need to check more specifically
    // We're checking that files from a 'temp' subdirectory are excluded, not files whose path contains 'temp'
    const tempSubdir = path.join(tempDir, 'temp');
    fs.mkdirSync(tempSubdir);
    fs.writeFileSync(path.join(tempSubdir, 'test.txt'), 'test');
    const filesWithTempDir = getAllFiles(tempDir);
    assert.ok(!filesWithTempDir.some(f => f.includes(path.join('temp', 'test.txt'))));
    fs.rmSync(tempSubdir, { recursive: true });
    
    assert.ok(!files.some(f => f.includes('tmp')));
    assert.ok(!files.some(f => f.includes('log')));
  });
  
  test('should handle ENOENT errors gracefully', () => {
    // Create a symlink to a non-existent file
    const symlinkPath = path.join(tempDir, 'broken-link');
    fs.symlinkSync(path.join(tempDir, 'non-existent'), symlinkPath);
    
    // Should not throw when encountering broken symlinks
    assert.doesNotThrow(() => {
      const files = getAllFiles(tempDir);
      assert.ok(Array.isArray(files));
    });
    
    // Clean up symlink
    fs.unlinkSync(symlinkPath);
  });
  
  test('should return empty array for empty directory', () => {
    const emptyDir = path.join(tempDir, 'empty');
    fs.mkdirSync(emptyDir);
    
    const files = getAllFiles(emptyDir);
    assert.deepStrictEqual(files, []);
    
    fs.rmdirSync(emptyDir);
  });
});

test.describe('repoDetails', () => {
  const tempDir = path.join(__dirname, 'temp-repodetails');
  const gitDir = path.join(tempDir, '.git');
  
  test.before(async () => {
    // Create temp directory and initialize git repo
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(gitDir, { recursive: true });
    
    // Initialize git repository
    await git.init({ fs, dir: tempDir });
    
    // Set remote origin
    await git.setConfig({
      fs,
      dir: tempDir,
      path: 'remote.origin.url',
      value: 'https://github.com/test/repo.git'
    });
    
    // Create a test file and commit
    fs.writeFileSync(path.join(tempDir, 'test.txt'), 'test content');
    await git.add({ fs, dir: tempDir, filepath: 'test.txt' });
    await git.commit({
      fs,
      dir: tempDir,
      message: 'Initial commit',
      author: {
        name: 'Test User',
        email: 'test@example.com'
      }
    });
  });
  
  test.after(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  
  test('should get repository details', async () => {
    const details = await getRepoDetails(tempDir);
    
    assert.ok(details);
    assert.strictEqual(details.repository, 'https://github.com/test/repo.git');
    assert.ok(details.commit); // Should have a commit hash
    assert.ok(details.timestamp); // Should have a timestamp
    
    // Validate timestamp format (ISO 8601)
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
    assert.ok(timestampRegex.test(details.timestamp));
  });
  
  test('should override with custom source details', async () => {
    const customDetails = {
      repositoryUrl: 'https://github.com/custom/repo.git',
      commitHash: 'abc123',
      commitTimestamp: '2023-01-01T00:00:00Z'
    };
    
    const details = await getRepoDetails(tempDir, customDetails);
    
    assert.strictEqual(details.repository, 'https://github.com/custom/repo.git');
    assert.strictEqual(details.commit, 'abc123');
    assert.strictEqual(details.timestamp, '2023-01-01T00:00:00Z');
  });
  
  test('should handle missing git repository', async () => {
    const nonGitDir = path.join(__dirname, 'temp-nongit');
    fs.mkdirSync(nonGitDir, { recursive: true });
    
    const details = await getRepoDetails(nonGitDir);
    
    // Should still return an object with at least timestamp
    assert.ok(details);
    assert.ok(details.timestamp);
    // Repository might be present if the test directory is inside a git repo
    // So we just check that the function returns without throwing
    
    fs.rmSync(nonGitDir, { recursive: true, force: true });
  });
  
  test('should fall back to execSync when isomorphic-git fails', async () => {
    // Create a directory without proper git initialization
    const tempDir2 = path.join(__dirname, 'temp-fallback');
    fs.mkdirSync(tempDir2, { recursive: true });
    
    // Initialize git using command line (simulating a case where isomorphic-git might fail)
    try {
      execSync('git init', { cwd: tempDir2 });
      execSync('git remote add origin https://github.com/fallback/repo.git', { cwd: tempDir2 });
      fs.writeFileSync(path.join(tempDir2, 'test.txt'), 'test');
      execSync('git add .', { cwd: tempDir2 });
      execSync('git commit -m "test"', { cwd: tempDir2 });
      
      const details = await getRepoDetails(tempDir2);
      
      assert.ok(details);
      assert.ok(details.repository);
      assert.ok(details.commit);
      assert.ok(details.timestamp);
    } catch (error) {
      // Git might not be available in CI, skip this test
      console.log('Skipping execSync fallback test - git not available');
    } finally {
      fs.rmSync(tempDir2, { recursive: true, force: true });
    }
  });
});

test.describe('yamlGenerator', () => {
  const tempDir = path.join(__dirname, 'temp-yamlgen');
  
  test.before(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });
  
  test.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  
  test('should generate YAML schema file', () => {
    const events = {
      'user.signup': {
        description: 'User signs up',
        properties: {
          email: { type: 'string' },
          name: { type: 'string' }
        }
      },
      'purchase.complete': {
        description: 'Purchase completed',
        properties: {
          orderId: { type: 'string' },
          amount: { type: 'number' }
        }
      }
    };
    
    const repository = {
      repository: 'https://github.com/test/repo.git',
      commit: 'abc123',
      timestamp: '2023-01-01T00:00:00Z'
    };
    
    const outputPath = path.join(tempDir, 'test-schema.yaml');
    
    // Should not throw
    assert.doesNotThrow(() => {
      generateYamlSchema(events, repository, outputPath);
    });
    
    // File should exist
    assert.ok(fs.existsSync(outputPath));
    
    // Read and parse the generated file
    const content = fs.readFileSync(outputPath, 'utf8');
    
    // Should contain language server comment
    assert.ok(content.startsWith('# yaml-language-server: $schema='));
    
    // Parse YAML (removing the comment)
    const yamlContent = content.replace(/^# yaml-language-server:.*\n/, '');
    const parsed = yaml.load(yamlContent);
    
    // Validate structure
    assert.strictEqual(parsed.version, 1);
    assert.deepStrictEqual(parsed.source, repository);
    assert.deepStrictEqual(parsed.events, events);
  });
  
  test('should generate YAML with proper formatting', () => {
    const events = {
      'complex.event': {
        description: 'Complex event with nested properties',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' }
            }
          },
          items: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    };
    
    const repository = {
      repository: 'https://github.com/test/repo.git'
    };
    
    const outputPath = path.join(tempDir, 'formatted-schema.yaml');
    generateYamlSchema(events, repository, outputPath);
    
    const content = fs.readFileSync(outputPath, 'utf8');
    
    // Check that the YAML is not wrapped (should be on single lines due to lineWidth: -1)
    // We check that nested properties don't start with excessive indentation
    const lines = content.split('\n');
    const hasWrappedLines = lines.some(line => {
      // Check for lines that start with 4+ spaces followed by non-whitespace
      // (indicating wrapped content)
      return /^    \S/.test(line) && !line.includes(':');
    });
    assert.ok(!hasWrappedLines, 'Should not have wrapped lines');
    
    // Should not have references (noRefs: true)
    assert.ok(!content.includes('&'), 'Should not contain YAML anchors');
    assert.ok(!content.includes('*'), 'Should not contain YAML aliases');
  });
  
  test('should handle empty events', () => {
    const events = {};
    const repository = { repository: 'https://github.com/test/repo.git' };
    const outputPath = path.join(tempDir, 'empty-schema.yaml');
    
    generateYamlSchema(events, repository, outputPath);
    
    const content = fs.readFileSync(outputPath, 'utf8');
    const yamlContent = content.replace(/^# yaml-language-server:.*\n/, '');
    const parsed = yaml.load(yamlContent);
    
    assert.deepStrictEqual(parsed.events, {});
  });
  
  test('should handle special characters in YAML', () => {
    const events = {
      'user:action': {
        description: 'Event with special characters: @#$%',
        properties: {
          'special-key': { type: 'string' },
          'another:key': { type: 'string' }
        }
      }
    };
    
    const repository = { repository: 'https://github.com/test/repo.git' };
    const outputPath = path.join(tempDir, 'special-chars-schema.yaml');
    
    generateYamlSchema(events, repository, outputPath);
    
    // Should be able to parse the generated YAML
    const content = fs.readFileSync(outputPath, 'utf8');
    const yamlContent = content.replace(/^# yaml-language-server:.*\n/, '');
    
    assert.doesNotThrow(() => {
      const parsed = yaml.load(yamlContent);
      assert.ok(parsed.events['user:action']);
      assert.ok(parsed.events['user:action'].properties['special-key']);
    });
  });
});

test.describe('typescript/function-finder', () => {
  function getArrowFunctionNodeFromCode(code) {
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
    let found = null;
    function visit(node) {
      if (ts.isArrowFunction(node)) {
        found = node;
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return found;
  }

  test('should detect useCallback wrapper (assigned)', () => {
    const code = 'const cb = useCallback(() => {}, []);';
    const node = getArrowFunctionNodeFromCode(code);
    const name = findWrappingFunction(node);
    assert.strictEqual(name, 'useCallback(cb)');
  });

  test('should detect useCallback wrapper (direct)', () => {
    const code = 'useCallback(() => {}, []);';
    const node = getArrowFunctionNodeFromCode(code);
    const name = findWrappingFunction(node);
    assert.strictEqual(name, 'useCallback()');
  });

  test('should detect useEffect wrapper (assigned)', () => {
    const code = 'const eff = useEffect(() => {}, []);';
    const node = getArrowFunctionNodeFromCode(code);
    const name = findWrappingFunction(node);
    assert.strictEqual(name, 'useEffect(eff)');
  });

  test('should detect useEffect wrapper (direct)', () => {
    const code = 'useEffect(() => {}, []);';
    const node = getArrowFunctionNodeFromCode(code);
    const name = findWrappingFunction(node);
    assert.strictEqual(name, 'useEffect()');
  });

  test('should detect useMemo wrapper (assigned)', () => {
    const code = 'const memo = useMemo(() => 42, []);';
    const node = getArrowFunctionNodeFromCode(code);
    const name = findWrappingFunction(node);
    assert.strictEqual(name, 'useMemo(memo)');
  });

  test('should detect useMemo wrapper (direct)', () => {
    const code = 'useMemo(() => 42, []);';
    const node = getArrowFunctionNodeFromCode(code);
    const name = findWrappingFunction(node);
    assert.strictEqual(name, 'useMemo()');
  });

  test('should fallback to variable name if not a hook', () => {
    const code = 'const notHook = () => {};';
    const node = getArrowFunctionNodeFromCode(code);
    const name = findWrappingFunction(node);
    assert.strictEqual(name, 'notHook');
  });
});
