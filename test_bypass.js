async function test() {
  const res = await fetch("http://localhost:3000/general", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ivc-user": "@hacker+a" },
    body: JSON.stringify({ text: "Hello" })
  });
  console.log(res.status, await res.text());
}
test();
