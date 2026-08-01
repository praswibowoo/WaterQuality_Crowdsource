import prisma from '../db/prisma.js';

async function addSessionIndex(): Promise<void> {
  try {
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_session_user_id
      ON session ((sess->>'userId'))
    `;
    console.log('Session userId index created or already exists.');
  } catch (err) {
    console.warn('Failed to create session index (non-fatal):', err);
  }
}

export default addSessionIndex;
