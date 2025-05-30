/**
 * @fileoverview File system utilities for recursively reading directories
 * @module analyze-tracking/utils/fileProcessor
 */

const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);

    let stats;
    try {
      stats = fs.statSync(fullPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return; // Skip this file or directory if it does not exist
      } else {
        throw error;
      }
    }

    // Skip hidden files and directories
    if (file.startsWith('.')) return

    // Skip common directories we don't want to analyze
    if (file === 'node_modules') return
    if (file === 'coverage') return
    if (file === 'temp') return
    if (file === 'tmp') return
    if (file === 'log') return

    if (stats.isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

module.exports = { getAllFiles };
