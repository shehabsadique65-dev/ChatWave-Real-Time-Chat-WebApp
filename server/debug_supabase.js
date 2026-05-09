const fs = require('fs');
const dns = require('dns');

require('dotenv').config();

const rawEnv = fs.readFileSync('.env', 'utf8');
console.log('--- RAW .ENV CONTENT ---');
console.log(rawEnv.split('\n').map((l, i) => `${i + 1}: ${JSON.stringify(l)}`).join('\n'));

console.log('\n--- RUNTIME PROCESS.ENV ---');
const supabaseUrl = process.env.SUPABASE_URL;
console.log('SUPABASE_URL type:', typeof supabaseUrl);
console.log('SUPABASE_URL JSON:', JSON.stringify(supabaseUrl));
console.log('SUPABASE_URL length:', supabaseUrl ? supabaseUrl.length : 0);

if (supabaseUrl) {
  for (let i = 0; i < supabaseUrl.length; i++) {
    console.log(`Char ${i}: '${supabaseUrl[i]}' (Code: ${supabaseUrl.charCodeAt(i)})`);
  }
  
  let hostname;
  try {
    const urlObj = new URL(supabaseUrl);
    hostname = urlObj.hostname;
    console.log('\nParsed Hostname:', hostname);
    console.log('Hostname length:', hostname.length);
    for (let i = 0; i < hostname.length; i++) {
      console.log(`Hostname Char ${i}: '${hostname[i]}' (Code: ${hostname.charCodeAt(i)})`);
    }
  } catch (err) {
    console.error('\nURL Parse Error:', err.message);
  }

  if (hostname) {
    console.log('\n--- DNS RESOLUTION ---');
    dns.lookup(hostname, (err, address, family) => {
      if (err) {
        console.error('DNS Lookup failed:', err.message);
      } else {
        console.log(`DNS Lookup success: ${address} (IPv${family})`);
      }
    });
  }
}
