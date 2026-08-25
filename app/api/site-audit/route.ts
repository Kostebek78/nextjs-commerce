import { NextResponse } from 'next/server';
import { auditWebsite } from 'lib/site-audit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const websiteUrl = typeof body.websiteUrl === 'string' ? body.websiteUrl : '';

    const result = await auditWebsite(websiteUrl);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tarama sırasında hata oluştu.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
