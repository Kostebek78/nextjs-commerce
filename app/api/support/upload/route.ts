import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
export const runtime='nodejs';
const allowed=new Set(['image/jpeg','image/png','image/webp','application/pdf']);
export async function POST(request:Request){const form=await request.formData();const file=form.get('file');if(!(file instanceof File)||!allowed.has(file.type)||file.size>5*1024*1024)return NextResponse.json({error:'Dosya türü desteklenmiyor veya dosya 5 MB sınırını aşıyor.'},{status:400});const ext=path.extname(file.name).toLowerCase()||'.bin';const name=`${randomUUID()}${ext}`;const dir=path.join(process.cwd(),'public','uploads','support');await mkdir(dir,{recursive:true});await writeFile(path.join(dir,name),Buffer.from(await file.arrayBuffer()));return NextResponse.json({url:`/uploads/support/${name}`,name:file.name,type:file.type});}
