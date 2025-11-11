#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Function to recursively find toolbar test results
function extractTestResults(suites) {
  const results = [];

  suites.forEach((suite) => {
    if (suite.file && suite.file.includes('toolbar')) {
      if (suite.specs) {
        suite.specs.forEach((spec) => {
          if (!spec.ok) {
            results.push(`- ${spec.title} ❌`);
          }
        });
      }
    }

    if (suite.suites) {
      results.push(...extractTestResults(suite.suites));
    }
  });

  return results;
}

// Main execution
function main() {
  try {
    const reportPath = path.join(process.cwd(), '../test-results/playwright-report.json');

    if (!fs.existsSync(reportPath)) {
      console.error(`Playwright JSON report not found at: ${reportPath}`);
      process.exit(1);
    }

    const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const results = extractTestResults(reportData.suites);

    process.stdout.write(results.join('\n'));
  } catch (error) {
    process.stderr.write(`Error reading or parsing the report: ${error.message}`);
    process.exit(1);
  }
}

main();
