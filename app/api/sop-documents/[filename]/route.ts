import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {NextResponse} from 'next/server';
import {requireRequestPortalSession} from '@/lib/auth-server';
import {allSops} from '@/lib/data';
import {jsonError, NO_STORE_HEADERS} from '@/lib/http-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedFiles = new Set(allSops.map((sop) => sop.sourceFile));

export async function GET(request: Request, {params}: {params: Promise<{filename: string}>}) {
  const session = await requireRequestPortalSession(request);
  if (!session) return jsonError('Authenticatie vereist.', 'unauthorized', 401);
  const {filename} = await params;
  if (path.basename(filename) !== filename || !filename.toLocaleLowerCase('nl-NL').endsWith('.docx') || !allowedFiles.has(filename)) {
    return jsonError('Document niet gevonden.', 'not_found', 404);
  }
  try {
    const bytes = await readFile(path.join(process.cwd(), 'private', 'sop-documents', filename));
    const asciiFallback = filename.normalize('NFKD').replace(/[^a-zA-Z0-9._ -]/g, '_');
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...NO_STORE_HEADERS,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({error: 'Document niet gevonden.', code: 'not_found'}, {status: 404, headers: NO_STORE_HEADERS});
  }
}
