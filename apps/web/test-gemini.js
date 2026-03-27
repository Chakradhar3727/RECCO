const apiKey = 'AIzaSyAwIr3TTmqsf71uCVzxDBePlv5TsNwYh08';
const prompt = 'You are a material expert. Which material is this?';
// 1x1 white pixel base64
const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

async function test() {
  console.log('Testing Gemini API...');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: dummyBase64 } }
        ]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 256 }
    })
  });
  
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

test();
