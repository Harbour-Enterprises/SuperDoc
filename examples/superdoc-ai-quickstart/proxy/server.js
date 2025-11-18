const fastify = require('fastify')({ logger: true });

// Register CORS
fastify.register(require('@fastify/cors'));

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'OK', service: 'SuperDoc AI Proxy' };
});

// OpenAI proxy endpoint
fastify.post('/', async (request, reply) => {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    reply.code(500);
    return { error: 'OPENAI_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({ 
        model: 'gpt-4o-mini',
        ...request.body, 
        stream: false 
      })
    });

    if (!response.ok) {
      const error = await response.text();
      reply.code(response.status);
      return { error };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    reply.code(500);
    return { error: 'Internal server error' };
  }
});

const start = async () => {
  try {
    const port = process.env.PORT || 8080;
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();