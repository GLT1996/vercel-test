import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = req.body as any;
  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password too short' });
  }

  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (exists) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email: normalizedEmail, passwordHash },
    select: { id: true, email: true, createdAt: true },
  });

  return res.status(201).json({ user });
}
