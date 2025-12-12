# SuperDoc Conversion Server

A simple Node.js server for converting legacy `.doc` files to `.docx` format using LibreOffice.

## Quick Start with Docker (Recommended)

The easiest way to run the conversion server is with Docker - no need to install LibreOffice manually.

### Using Docker Compose

```bash
cd conversion-server
docker-compose up -d
```

### Using Docker directly

```bash
cd conversion-server

# Build the image
docker build -t superdoc-conversion-server .

# Run the container
docker run -d -p 3001:3001 --name superdoc-conversion superdoc-conversion-server
```

The server will be available at `http://localhost:3001`.

### Docker Commands

```bash
# View logs
docker-compose logs -f

# Stop the server
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

---

## Manual Setup (Without Docker)

If you prefer to run without Docker, you'll need to install LibreOffice manually.

## Prerequisites

### LibreOffice Installation

This server requires LibreOffice to be installed on your system.

#### macOS

**Option 1: Direct Download**
- Download from: https://www.libreoffice.org/download/download/

**Option 2: Homebrew**
```bash
brew install --cask libreoffice
```

#### Linux

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install libreoffice
```

**Fedora:**
```bash
sudo dnf install libreoffice
```

**Arch Linux:**
```bash
sudo pacman -S libreoffice-fresh
```

#### Windows

Download from: https://www.libreoffice.org/download/download/

## Setup

1. Navigate to the conversion-server folder:
   ```bash
   cd conversion-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001`.

## API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Conversion server is running"
}
```

### `GET /check-libreoffice`
Check if LibreOffice is properly installed.

**Response (success):**
```json
{
  "status": "ok",
  "message": "LibreOffice is installed",
  "path": "/Applications/LibreOffice.app/Contents/MacOS/soffice"
}
```

**Response (error):**
```json
{
  "status": "error",
  "message": "LibreOffice not found. Please install it.",
  "instructions": {
    "os": "macOS",
    "methods": [
      "Download from: https://www.libreoffice.org/download/download/",
      "Or via Homebrew: brew install --cask libreoffice"
    ]
  }
}
```

### `POST /convert`
Convert a `.doc` file to `.docx` format.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` - The `.doc` file to convert

**Response:**
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Body: The converted `.docx` file

**Example using curl:**
```bash
curl -X POST -F "file=@document.doc" http://localhost:3001/convert -o document.docx
```

## Usage with SuperDoc Dev

1. Start the conversion server:
   ```bash
   cd conversion-server
   npm start
   ```

2. In another terminal, start SuperDoc dev:
   ```bash
   npm run dev
   ```

3. Open http://localhost:9094 in your browser

4. Upload a `.doc` file - a dialog will appear offering to convert it

5. Click "Convert & Edit" to convert and load the document

## Configuration

### Port

Set the `PORT` environment variable to change the server port:
```bash
PORT=3002 npm start
```

### CORS

By default, the server allows requests from:
- `http://localhost:9094`
- `http://localhost:9096`
- `http://127.0.0.1:9094`

To modify allowed origins, edit the `cors` configuration in `server.js`.

## Troubleshooting

### "LibreOffice not found"

1. Verify LibreOffice is installed:
   ```bash
   # macOS
   ls /Applications/LibreOffice.app

   # Linux
   which soffice
   ```

2. If installed in a non-standard location, add the path to the `possiblePaths` array in `server.js`.

### "Conversion failed"

1. Check the server console for error details
2. Ensure the `.doc` file is not corrupted
3. Try converting the file manually with LibreOffice to verify it works

### CORS errors

If you're running the dev server on a different port, add it to the CORS `origin` array in `server.js`.

## Security Notes

- This server is designed for local development
- For production use, add authentication and rate limiting
- Files are temporarily stored in the system temp directory and deleted after conversion
