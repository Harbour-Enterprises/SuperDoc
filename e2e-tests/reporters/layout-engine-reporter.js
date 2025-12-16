import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Custom Playwright reporter that reorganizes layout engine test results
 * into a cleaner folder structure:
 *   test-results/visuals-layout-engine/<filename>-<hash>/
 */
class LayoutEngineReporter {
  constructor(options = {}) {
    this.outputDir = options.outputDir || 'test-results';
    this.layoutEngineDir = path.join(this.outputDir, 'visuals-layout-engine');
  }

  onTestEnd(test, result) {
    // Only process layout engine tests
    if (!test.title || !test.parent?.title?.includes('layout engine')) {
      return;
    }

    // Only process failed tests with attachments
    if (result.status === 'passed' || !result.attachments?.length) {
      return;
    }

    // Extract the document filename from the test title (e.g., "basic-documents-list-style.docx")
    const testId = test.title;
    const hash = crypto.createHash('md5').update(testId).digest('hex').slice(0, 6);
    const cleanName = `${testId.replace(/\.[^.]+$/, '')}-${hash}`;

    const targetDir = path.join(this.layoutEngineDir, cleanName);

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copy attachments to the new location
    for (const attachment of result.attachments) {
      if (attachment.path && fs.existsSync(attachment.path)) {
        const fileName = path.basename(attachment.path);
        const targetPath = path.join(targetDir, fileName);

        try {
          fs.copyFileSync(attachment.path, targetPath);
        } catch (err) {
          console.error(`Failed to copy ${attachment.path} to ${targetPath}:`, err.message);
        }
      }
    }
  }

  onEnd(result) {
    // Clean up original truncated folders for layout engine tests
    if (!fs.existsSync(this.outputDir)) return;

    const entries = fs.readdirSync(this.outputDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Match the truncated Playwright folder pattern for layout engine tests
      // Pattern: visuals-layout-engine-layo-XXXXX-...
      if (entry.name.startsWith('visuals-layout-engine-layo-')) {
        const folderPath = path.join(this.outputDir, entry.name);
        try {
          fs.rmSync(folderPath, { recursive: true, force: true });
        } catch (err) {
          console.error(`Failed to remove ${folderPath}:`, err.message);
        }
      }
    }
  }
}

export default LayoutEngineReporter;
