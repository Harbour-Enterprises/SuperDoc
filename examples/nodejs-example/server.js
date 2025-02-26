import fs from 'fs/promises';
import express from 'express';

import { getEditor } from "./super-editor.js";


const initServer = async () => {

  // Init express
  const app = express();
  app.use(express.json());

  /**
   * Health check endpoint
   */
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
    });
  });


  app.get('/', async (req, res) => {
    try {
      // Load our example document
      const documentData = await fs.readFile('./document.docx');

      // Initialize the editor
      const editor = await getEditor(documentData);

      // Example of getting current JSON state of the editor
      const jsonData = editor.getHTML();

      // Example of getting the current HTML state of the editor
      const htmlData = editor.getHTML();

      res.send({
        html: htmlData,
        json: jsonData,
      });

    } catch (error) {
      console.error(error);
      res.status(422).send('Failed to initialize SuperEditor');
    }
  });


  /**
   * Initialize the server
  */
  app.listen(3000, '0.0.0.0', () => {
    console.debug(`Server running on port 3000`);
  });

  return app;
};

export const app = await initServer();
