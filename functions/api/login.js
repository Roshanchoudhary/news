export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return Response.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await env.DB
      .prepare(`
        SELECT id, name, email, password_hash, role, status
        FROM users
        WHERE email = ?
        LIMIT 1
      `)
      .bind(email)
      .first();

    if (!user || user.status !== "active") {
      return Response.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(
      password,
      user.password_hash
    );

    if (!valid) {
      return Response.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = crypto.randomUUID();

    const headers = new Headers({
      "Content-Type": "application/json",
      "Set-Cookie":
        `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }),
      {
        status: 200,
        headers
      }
    );

  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function verifyPassword(password, stored) {
  try {
    const parts = stored.split("$");

    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
      return false;
    }

    const iterations = Number(parts[1]);
    const salt = fromHex(parts[2]);
    const expected = fromHex(parts[3]);

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
        iterations,
        hash: "SHA-256"
      },
      key,
      256
    );

    return timingSafeEqual(
      new Uint8Array(bits),
      expected
    );

  } catch {
    return false;
  }
}

function fromHex(hex) {
  const result = new Uint8Array(hex.length / 2);

  for (let i = 0; i < result.length; i++) {
    result[i] = parseInt(
      hex.substring(i * 2, i * 2 + 2),
      16
    );
  }

  return result;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}
