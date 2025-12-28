import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    if (!email || !password) {
      return NextResponse.json({ ok: false, message: '邮箱和密码为必填项' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    // Create user if not exists; otherwise update password
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: hashed },
      create: { email, passwordHash: hashed },
    });

    return NextResponse.json({ ok: true, message: `记录成功，欢迎 ${user.email}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, message: '服务器错误' }, { status: 500 });
  }
}
