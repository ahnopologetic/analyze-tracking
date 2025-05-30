/**
 * TrackingVisitor class for analyzing Ruby tracking events
 */

const { detectSource } = require('./detectors');
const { extractEventName, extractProperties } = require('./extractors');
const { findWrappingFunction, traverseNode, getLineNumber } = require('./traversal');

class TrackingVisitor {
  constructor(code, filePath, customFunction = null) {
    this.code = code;
    this.filePath = filePath;
    this.customFunction = customFunction;
    this.events = [];
  }

  /**
   * Processes a call node to extract tracking event information
   * @param {Object} node - The CallNode to process
   * @param {Array} ancestors - The ancestor nodes stack
   */
  async processCallNode(node, ancestors) {
    try {
      const source = detectSource(node, this.customFunction);
      if (!source) return;

      const eventName = extractEventName(node, source);
      if (!eventName) return;

      const line = getLineNumber(this.code, node.location);
      const functionName = await findWrappingFunction(node, ancestors);
      const properties = await extractProperties(node, source);

      this.events.push({
        eventName,
        source,
        properties,
        filePath: this.filePath,
        line,
        functionName
      });
    } catch (nodeError) {
      console.error(`Error processing node in ${this.filePath}:`, nodeError.message);
    }
  }

  /**
   * Analyzes the AST to find tracking events
   * @param {Object} ast - The parsed AST
   * @returns {Array} - Array of tracking events found
   */
  async analyze(ast) {
    // Create a visitor function that will be called for each CallNode
    const nodeVisitor = async (node, ancestors) => {
      await this.processCallNode(node, ancestors);
    };

    // Traverse the AST starting from the program node
    await traverseNode(ast.value, nodeVisitor);

    return this.events;
  }
}

module.exports = TrackingVisitor;
