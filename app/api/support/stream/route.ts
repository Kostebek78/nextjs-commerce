import { getSupportSnapshot, subscribe } from 'lib/support';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){const encoder=new TextEncoder();let cleanup=()=>{};const stream=new ReadableStream({async start(controller){const send=async()=>controller.enqueue(encoder.encode(`event: support\ndata: ${JSON.stringify(await getSupportSnapshot())}\n\n`));await send();const unsubscribe=subscribe(()=>{void send();});cleanup=()=>{unsubscribe();try{controller.close();}catch{}};},cancel(){cleanup();}});return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'}});}
