export function GET() { 
  const res = new Response("ok"); 
  res.headers.set("Set-Cookie", "test=123; Path=/; SameSite=Lax");
  return res;
}
