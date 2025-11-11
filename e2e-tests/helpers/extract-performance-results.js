#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Function to recursively find all test results in the nested structure
function extractTestResults(suites) {
  const results = [];

  suites.forEach((suite) => {
    if (suite.file.toLowerCase() !== 'performance/performance.spec.js') {
      return;
    }
    if (suite.specs) {
      suite.specs.forEach((spec) => {
        if (spec.tests) {
          spec.tests.forEach((test) => {
            if (test.results) {
              test.results.forEach((result) => {
                if (result.status === 'failed') {
                  let expectedValue = 'N/A';
                  let receivedValue = 'N/A';

                  if (result.error) {
                    const cleanMessage = result.error.message.replace(/\u001b\[[0-9;]*m/g, '');
                    // Be tolerant to extra spaces
                    const match = cleanMessage.match(/Expected:\s*<\s*(\d+)\s*\nReceived:\s*(\d+)/);
                    if (match) {
                      expectedValue = `< ${match[1]}ms`;
                      receivedValue = `${match[2]}ms`;
                    }
                  }

                  results.push({
                    testName: spec.title,
                    specFile: spec.file,
                    expectedValue,
                    receivedValue,
                    testDuration: result.duration || 0,
                  });
                }
              });
            }
          });
        }
      });
    }

    if (suite.suites) {
      results.push(...extractTestResults(suite.suites));
    }
  });

  return results;
}

// Function to extract performance test results
function extractPerformanceResults(jsonPath) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const allResults = extractTestResults(data.suites);

  // Keep only results from the performance specs folder
  return allResults.filter((result) => result.specFile && result.specFile.includes('performance/'));
}

// Function to format results as plain text
function formatResultsAsText(results) {
  if (results.length === 0) {
    return 'No failed performance tests found.\n';
  }

  let output = `Failed Performance Tests: ${results.length}\n\n`;

  results.forEach((result, index) => {
    output += `${index + 1}. ${result.testName}\n`;
    output += `   Expected: ${result.expectedValue}\n`;
    output += `   Received: ${result.receivedValue}\n`;
    output += `   Test Duration: ${result.testDuration}ms\n\n`;
  });

  return output;
}

// Main execution
function main() {
  // Fixed path to the Playwright JSON report (matches playwright.config.js)
  const jsonPath = path.join(process.cwd(), '../test-results', 'playwright-report.json');

  if (!fs.existsSync(jsonPath)) {
    console.error(`Playwright JSON report not found at: ${jsonPath}`);
    process.exit(1);
  }

  const results = extractPerformanceResults(jsonPath);
  const formattedOutput = formatResultsAsText(results);

  // Write results to STDOUT only
  process.stdout.write(formattedOutput);
}

main();
