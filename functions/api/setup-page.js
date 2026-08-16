export async function onRequestGet() {
  return new Response(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Admin Setup</title>
<style>
body {
  font-family: Arial;
  max-width: 420px;
  margin: 60px auto;
  padding: 20px;
}
input, button {
  width: 100%;
  padding: 12px;
  margin: 8px 0;
  box-sizing: border-box;
}
button {
  cursor: pointer;
}
#msg {
  margin-top: 15px;
}
</style>
</head>
<body>

<h2>मैथिली समाचार — Admin Setup</h2>

<input id="name" placeholder="Admin Name">
<input id="email" type="email" placeholder="Admin Email">
<input id="password" type="password" placeholder="Password">

<button onclick="createAdmin()">Create Admin</button>

<div id="msg"></div>

<script>
async function createAdmin() {

  const setupKey = prompt("Setup Key डालू:");

  const res = await fetch("/api/setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Setup-Key": setupKey
    },
    body: JSON.stringify({
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      password: document.getElementById("password").value
    })
  });

  const data = await res.json();

  document.getElementById("msg").textContent =
    data.message || data.error;
}
</script>

</body>
</html>
  `, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8"
    }
  });
}
