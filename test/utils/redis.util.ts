import { createClient } from 'redis';

export const flushRedis = async () => {
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  client.on('error', (err) => console.error('Redis Client Error', err));

  try {
    await client.connect();
    await client.flushDb();
  } catch (error) {
    console.error('Error flushing Redis:', error);
  } finally {
    await client.disconnect();
  }
};
