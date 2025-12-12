import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS for local development
app.use(cors({
  origin: ['http://localhost:9094', 'http://localhost:9096', 'http://127.0.0.1:9094'],
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const tempDir = path.join(os.tmpdir(), 'superdoc-conversions');
    await fs.mkdir(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename to avoid collisions
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.doc', '.DOC'];
    const ext = path.extname(file.originalname);
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .doc files are allowed'));
    }
  },
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Conversion server is running' });
});

// Check LibreOffice installation
app.get('/check-libreoffice', async (req, res) => {
  try {
    const libreOfficePath = await findLibreOffice();
    res.json({
      status: 'ok',
      message: 'LibreOffice is installed',
      path: libreOfficePath
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'LibreOffice not found. Please install it.',
      instructions: getInstallInstructions()
    });
  }
});

// Main conversion endpoint
app.post('/convert', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const outputDir = path.dirname(inputPath);
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const expectedOutputPath = path.join(outputDir, `${baseName}.docx`);

  try {
    // Find LibreOffice
    const libreOfficePath = await findLibreOffice();

    // Convert using LibreOffice
    console.log(`Converting: ${inputPath}`);
    const command = `"${libreOfficePath}" --headless --convert-to docx --outdir "${outputDir}" "${inputPath}"`;

    await execAsync(command, { timeout: 60000 }); // 60 second timeout

    // Check if output file exists
    try {
      await fs.access(expectedOutputPath);
    } catch {
      throw new Error('Conversion completed but output file not found');
    }

    // Read the converted file
    const convertedFile = await fs.readFile(expectedOutputPath);

    // Set response headers
    const originalName = req.file.originalname.replace(/\.doc$/i, '.docx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.setHeader('Content-Length', convertedFile.length);

    // Send the file
    res.send(convertedFile);

    // Cleanup files
    await cleanupFiles([inputPath, expectedOutputPath]);

  } catch (error) {
    console.error('Conversion error:', error);

    // Cleanup input file on error
    await cleanupFiles([inputPath, expectedOutputPath]).catch(() => {});

    if (error.message.includes('not found') || error.message.includes('ENOENT')) {
      return res.status(500).json({
        error: 'LibreOffice not found',
        instructions: getInstallInstructions()
      });
    }

    res.status(500).json({
      error: 'Conversion failed',
      details: error.message
    });
  }
});

// Find LibreOffice installation
async function findLibreOffice() {
  const possiblePaths = [
    // macOS
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    '/opt/homebrew/bin/soffice',
    '/usr/local/bin/soffice',
    // Linux
    '/usr/bin/soffice',
    '/usr/bin/libreoffice',
    '/usr/lib/libreoffice/program/soffice',
    '/snap/bin/libreoffice',
    // Windows (WSL)
    '/mnt/c/Program Files/LibreOffice/program/soffice.exe',
  ];

  for (const p of possiblePaths) {
    try {
      await fs.access(p, fs.constants.X_OK);
      return p;
    } catch {
      // Continue to next path
    }
  }

  // Try to find via command line
  try {
    const { stdout } = await execAsync('which soffice');
    const path = stdout.trim();
    if (path) return path;
  } catch {
    // Not found via which
  }

  throw new Error('LibreOffice not found');
}

// Get installation instructions based on OS
function getInstallInstructions() {
  const platform = os.platform();

  if (platform === 'darwin') {
    return {
      os: 'macOS',
      methods: [
        'Download from: https://www.libreoffice.org/download/download/',
        'Or via Homebrew: brew install --cask libreoffice'
      ]
    };
  } else if (platform === 'linux') {
    return {
      os: 'Linux',
      methods: [
        'Ubuntu/Debian: sudo apt install libreoffice',
        'Fedora: sudo dnf install libreoffice',
        'Arch: sudo pacman -S libreoffice-fresh'
      ]
    };
  } else {
    return {
      os: 'Windows',
      methods: [
        'Download from: https://www.libreoffice.org/download/download/'
      ]
    };
  }
}

// Cleanup temporary files
async function cleanupFiles(files) {
  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ========================================
    SuperDoc Conversion Server
  ========================================

  Server running at: http://localhost:${PORT}

  Endpoints:
    GET  /health           - Health check
    GET  /check-libreoffice - Check LibreOffice installation
    POST /convert          - Convert .doc to .docx

  Make sure LibreOffice is installed!
  ========================================
  `);

  // Check LibreOffice on startup
  findLibreOffice()
    .then(path => console.log(`  LibreOffice found at: ${path}\n`))
    .catch(() => {
      console.log(`  WARNING: LibreOffice not found!`);
      console.log(`  Install instructions:`, getInstallInstructions());
      console.log('');
    });
});
