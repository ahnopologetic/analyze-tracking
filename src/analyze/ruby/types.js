/**
 * @fileoverview Type definitions and constants for Ruby analytics analysis
 * @module analyze/ruby/types
 */

async function getValueType(node) {
  const { 
    StringNode, 
    IntegerNode, 
    FloatNode, 
    TrueNode, 
    FalseNode, 
    NilNode, 
    SymbolNode, 
    CallNode 
  } = await import('@ruby/prism');

  if (node instanceof StringNode) return 'string';
  if (node instanceof IntegerNode || node instanceof FloatNode) return 'number';
  if (node instanceof TrueNode || node instanceof FalseNode) return 'boolean';
  if (node instanceof NilNode) return 'null';
  if (node instanceof SymbolNode) return 'string';
  if (node instanceof CallNode) return 'any'; // Dynamic values
  
  return 'any'; // Default type
}

module.exports = {
  getValueType
};
