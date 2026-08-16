export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const setupKey = request.headers.get("X-Setup-Key");
    if (!setupKey || setupKey !== env.SETUP_KEY) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name || !email || !password) {
      return Response.json(
        { success: false, error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    await env.DB.prepare(`
      INSERT INTO users
      (name, email, password_hash, role, status)
      VALUES (?, ?, ?, 'admin', 'active')
    `)
      .bind(name, email, passwordHash)
      .run();

    return Response.json({
      success: true,
      message: "Admin created successfully"
    });

  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    key,
    256
  );

  return `pbkdf2$100000$${toHex(salt)}$${toHex(new Uint8Array(bits))}`;
}

function toHex(bytes) {
  return [...bytes]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
