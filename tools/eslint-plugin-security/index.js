"use strict";

function createEvalDetectionRule() {
  return {
    meta: {
      type: "problem",
      docs: {
        description: "Detect eval() usage with expressions",
      },
      schema: [],
      messages: {
        avoidEval: "Avoid eval() to reduce code-injection risk.",
      },
    },
    create(context) {
      return {
        CallExpression(node) {
          if (
            node.callee &&
            node.callee.type === "Identifier" &&
            node.callee.name === "eval"
          ) {
            context.report({ node, messageId: "avoidEval" });
          }
        },
      };
    },
  };
}

function createNewFunctionRule() {
  return {
    meta: {
      type: "problem",
      docs: {
        description: "Detect new Function() usage",
      },
      schema: [],
      messages: {
        avoidNewFunction:
          "Avoid Function constructor to reduce code-injection risk.",
      },
    },
    create(context) {
      return {
        NewExpression(node) {
          if (
            node.callee &&
            node.callee.type === "Identifier" &&
            node.callee.name === "Function"
          ) {
            context.report({ node, messageId: "avoidNewFunction" });
          }
        },
      };
    },
  };
}

const rules = {
  "detect-eval-with-expression": createEvalDetectionRule(),
  "detect-new-function": createNewFunctionRule(),
};

module.exports = {
  meta: {
    name: "eslint-plugin-security",
    version: "0.0.0-local",
  },
  rules,
  configs: {
    recommended: {
      plugins: ["security"],
      rules: {
        "security/detect-eval-with-expression": "error",
        "security/detect-new-function": "error",
      },
    },
  },
};
