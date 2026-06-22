// test-wa-integration.js
const crypto = require('crypto');

async function testIntegration() {
  const TRUSTHOME_API = 'http://localhost:5000/api';
  const customerPhone = '+919999988888';
  const title = 'WhatsApp Service Request';
  const desc = 'My AC is not cooling, requested via WhatsApp bot testing script';
  
  try {
    const docketId = crypto.randomUUID();
    console.log('Sending docket creation request to HRMS backend...', docketId);
    const r = await fetch(`${TRUSTHOME_API}/dockets`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer hrms-s2s-secret-key'
      },
      body: JSON.stringify({
        id: docketId,
        customer: customerPhone,
        type: 'repair',
        title: title,
        desc: desc,
        address: 'Address requested via WhatsApp',
        preferredDate: new Date().toISOString().slice(0, 10),
      }),
    });
    const data = await r.json();
    console.log('Response from HRMS:', data);
    
    if (r.ok) {
      console.log('SUCCESS: Server-to-Server communication working perfectly!');
      process.exit(0);
    } else {
      console.error('FAILED: API returned an error.');
      process.exit(1);
    }
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

testIntegration();
