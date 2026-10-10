async function testSpoof() {
  const res = await fetch('http://localhost:3000/unprotected', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-IVC-User': '@admin+oa'
    },
    body: JSON.stringify({ text: "Hello" })
  });
  console.log(await res.json());
}
testSpoof();
