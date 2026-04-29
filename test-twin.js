async function run() {
  // 1. Register a test user
  const email = `test-${Date.now()}@example.com`;
  const regRes = await fetch("http://localhost:5000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password", name: "Test User", role: "patient" })
  });
  const regData = await regRes.json();
  const token = regData.token;
  const userId = regData.user.id;

  // 2. Get CSRF Token
  const csrfRes = await fetch("http://localhost:5000/api/csrf-token", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const csrfData = await csrfRes.json();
  const csrf = csrfData.token;

  // 3. Get Twin (initializes it)
  await fetch(`http://localhost:5000/api/twin/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  // 4. Simulate Twin
  const simRes = await fetch(`http://localhost:5000/api/twin/${userId}/simulate`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf
    },
    body: JSON.stringify({
      targetWeight: 75,
      targetAdherence: 80,
      targetSleep: 7,
      targetStress: 5,
      targetSteps: 5000
    })
  });
  const simData = await simRes.text();
  console.log("SIMULATION RESPONSE:", simRes.status, simData);
}

run().catch(console.error);
