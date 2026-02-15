import fs from 'fs';
import path from 'path';

// Parse .env manually to ensure we get the latest key without caching issues
const envPath = path.resolve(process.cwd(), '.env');
let API_KEY = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
  if (match && match[1]) {
    API_KEY = match[1].trim();
  }
} catch (e) {
  console.error("Could not read .env file");
}

console.log(`Using API Key: ${API_KEY ? API_KEY.substring(0, 10) + '...' : 'NOT FOUND'}`);

const VERSIONS = ['v1', 'v1beta'];

async function testModels(version) {
  console.log(`\n--- Testing ${version} listModels ---`);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/${version}/models?key=${API_KEY}`);
    const data = await res.json();
    if (data.models) {
      console.log(`Available models (${version}):`, data.models.map(m => m.name).slice(0, 3)); // Show first 3
      return true;
    } else {
      console.error(`Error listing models (${version}):`, JSON.stringify(data, null, 2));
      return false;
    }
  } catch (err) {
    console.error(`Fetch error (${version}):`, err.message);
    return false;
  }
}

async function testChat(version, model) {
  console.log(`\n--- Testing ${version}/${model} generateContent ---`);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say "Connection Successful"' }] }]
      })
    });
    const data = await res.json();
    if (data.candidates) {
      console.log(`SUCCESS (${version}/${model}):`, data.candidates[0].content.parts[0].text);
      return true;
    } else {
      console.error(`FAILURE (${version}/${model}):`, JSON.stringify(data, null, 2));
      return false;
    }
  } catch (err) {
    console.error(`Fetch error (${version}/${model}):`, err.message);
    return false;
  }
}

async function runTests() {
  if (!API_KEY) {
    console.error("Checking failed: API Key not found.");
    process.exit(1);
  }

  // Check available models first to debug 404
  await testModels('v1beta');
  
  // Just test the one we care about for speed
  const success = await testChat('v1beta', 'gemini-2.5-flash');
  if (success) {
      console.log("\n>>> VERIFICATION PASSED: API Key is valid and gemini-2.5-flash is working. <<<");
  } else {
      console.log("\n>>> VERIFICATION FAILED: Could not connect with the provided key. <<<");
      process.exit(1);
  }
}

runTests();
