import express from 'express';
import cors from 'cors';
import { DocumentManager } from '@y-sweet/sdk';

const CONNECTION_STRING = process.env.CONNECTION_STRING || 'ys://127.0.0.1:8080';
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

const manager = new DocumentManager(CONNECTION_STRING);

app.post('/api/auth', async (req, res) => {
  try {
    const { docId } = req.body;
    const clientToken = await manager.getOrCreateDocAndToken(docId);
    res.json(clientToken);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Failed to get auth token' });
  }
});

app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`);
  console.log(`Using Y-Sweet server at: ${CONNECTION_STRING}`);
});
