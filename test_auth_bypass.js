import assert from 'assert';

async function testAuthBypass() {
  const baseUrl = 'http://localhost:3000';

  const testCases = [
    { path: '/+test', expectedStatus: 401 },
    { path: '/-test', expectedStatus: 401 },
    { path: '/#test', expectedStatus: 401 },
    { path: '/@test', expectedStatus: 401 },
    { path: '/$test', expectedStatus: 401 },
    { path: '/%C2%A7test', expectedStatus: 401 }, // § is URL-encoded
    { path: '/%E2%88%86test', expectedStatus: 401 }, // ∆ is URL-encoded
    { path: '/~test', expectedStatus: 401 },
    { path: '/vite/asset', expectedStatus: 404 } // Unprotected route, returns 404 not 401
  ];

  let passed = true;

  for (const { path, expectedStatus } of testCases) {
    try {
      const response = await fetch(`${baseUrl}${path}`);

      if (response.status !== expectedStatus) {
        console.error(`❌ Test failed for path ${path}: Expected status ${expectedStatus}, but got ${response.status}`);
        passed = false;
      } else {
        console.log(`✅ Test passed for path ${path} (status: ${response.status})`);
      }
    } catch (error) {
      console.error(`❌ Request failed for path ${path}: ${error.message}`);
      passed = false;
    }
  }

  if (!passed) {
    process.exit(1);
  } else {
    console.log('🎉 All tests passed successfully!');
    process.exit(0);
  }
}

testAuthBypass();
