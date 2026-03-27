export function GET(req: Request) { 
  const headers = Object.fromEntries(req.headers);
  return new Response(JSON.stringify(headers));
}
