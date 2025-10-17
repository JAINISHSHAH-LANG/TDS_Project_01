// Test script to send requests to your API
require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY;

// Test Round 1 Request
async function testRound1() {
  const requestData = {
    email: "student@example.com",
    secret: SECRET_KEY,
    task: "sum-of-sales-abc12",
    round: 1,
    nonce: "test-nonce-" + Date.now(),
    brief: "Create a simple web page that displays 'Hello World' with a blue background. Add a button that shows an alert when clicked.",
    checks: [
      "Page displays 'Hello World'",
      "Background is blue",
      "Button triggers alert on click"
    ],
    evaluation_url: "https://webhook.site/8bbc90ad-a189-4781-a1b5-9a3380c1eda5", // Replace with your test webhook
    attachments: []
  };

  try {
    console.log('Sending Round 1 request...\n');
    
    const response = await fetch('http://localhost:3000/api/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Request accepted! Check your GitHub for new repo.');
      console.log(`Expected repo name: sum-of-sales-abc12`);
    } else {
      console.log('\n❌ Request failed!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test Round 2 Request (run after Round 1 completes)
async function testRound2() {
  const requestData = {
    email: "student@example.com",
    secret: SECRET_KEY,
    task: "sum-of-sales-abc12", // Same task name as Round 1
    round: 2,
    nonce: "test-nonce-" + Date.now(),
    brief: "Add a counter that increments when the button is clicked. Display the count next to the button.",
    checks: [
      "Counter displays current count",
      "Count increments on button click",
      "Counter starts at 0"
    ],
    evaluation_url: "https://webhook.site/8bbc90ad-a189-4781-a1b5-9a3380c1eda5",
    attachments: []
  };

  try {
    console.log('Sending Round 2 request...\n');
    
    const response = await fetch('http://localhost:3000/api/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Update request accepted! Check your GitHub for updated repo.');
    } else {
      console.log('\n❌ Request failed!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run tests
const args = process.argv.slice(2);
if (args[0] === 'round2') {
  testRound2();
} else {
  testRound1();
}
