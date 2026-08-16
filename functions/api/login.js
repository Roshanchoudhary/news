// functions/api/login.js

const SESSION_DAYS = 1;
const PBKDF2_ITERATIONS = 100000;

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();

    // ==============================
    // FIRST ADMIN PASSWORD SETUP
    // ==============================
    if (body.action === "setup") {
      const setupKey = request.headers.get("X-Setup-Key");

      if (!env.SETUP_KEY) {
        return Response.json(
          {
            success: false,
            error: "SETUP_KEY secret configured नहीं अछि"
          },
          { status: 500 }
        );
      }

      if (setupKey !== env.SETUP_KEY) {
        return Response.json(
          {
            success: false,
            error: "Invalid setup key"
          },
          { status: 401 }
        );
      }

      const name = String(body.name || "Admin").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");

      if (!email || !password) {
        return Response.json(
          {
            success: false,
            error: "Email आ password जरूरी अछि"
          },
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return Response.json(
          {
            success: false,
            error: "Password कम-से-कम 8 characters केर हो"
          },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(password);

      const existing = await env.DB
        .prepare(`
          SELECT id
          FROM users
          WHERE email = ?
          LIMIT 1
        `)
        .bind(email)
        .first();

      if (existing) {
        await env.DB
          .prepare(`
            UPDATE users
            SET
              name = ?,
              password_hash = ?,
              role = 'admin',
              status = 'active'
            WHERE id = ?
          `)
          .bind(name, passwordHash, existing.id)
          .run();
      } else {
        await env.DB
          .prepare(`
            INSERT INTO users
            (name, email, password_hash, role, status)
            VALUES (?, ?, ?, 'admin', 'active')
          `)
          .bind(name, email, passwordHash)
          .run();
      }

      return Response.json({
        success: true,
        message: "Admin password successfully set"
      });
    }

    // ==============================
    // LOGIN
    // ==============================

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");

    if (!email || !password) {
      return Response.json(
        {
          success: false,
          error: "Email आ password दिअ"
        },
        { status: 400 }
      );
    }

    const user = await env.DB
      .prepare(`
        SELECT
          id,
          name,
          email,
          password_hash,
          role,
          status
        FROM users
        WHERE email = ?
        LIMIT 1
      `)
      .bind(email)
      .first();

    if (!user || user.status !== "active") {
      return Response.json(
        {
          success: false,
          error: "Email अथवा password गलत अछि"
        },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(
      password,
      user.password_hash
    );

    if (!valid) {
      return Response.json(
        {
          success: false,
          error: "Email अथवा password गलत अछि"
        },
        { status: 401 }
      );
    }

    if (!env.AUTH_SECRET) {
      return Response.json(
        {
          success: false,
          error: "AUTH_SECRET configured नहीं अछि"
        },
        { status: 500 }
      );
    }

    const token = await createSessionToken(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      env.AUTH_SECRET
    );

    const headers = new Headers({
      "Content-Type": "application/json"
    });

    headers.append(
      "Set-Cookie",
      `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Login सफल",
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
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}


// ======================================
// CHECK LOGIN SESSION
// ======================================

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    if (!env.AUTH_SECRET) {
      return Response.json(
        {
          success: false,
          error: "AUTH_SECRET configured नहीं अछि"
        },
        { status: 500 }
      );
    }

    const cookies = parseCookies(
      request.headers.get("Cookie") || ""
    );

    const token = cookies.session;

    if (!token) {
      return Response.json(
        {
          success: false,
          error: "Not logged in"
        },
        { status: 401 }
      );
    }

    const session =
      await verifySessionToken(
        token,
        env.AUTH_SECRET
      );

    if (!session) {
      return Response.json(
        {
          success: false,
          error: "Session expired"
        },
        { status: 401 }
      );
    }

    const user = await env.DB
      .prepare(`
        SELECT
          id,
          name,
          email,
          role,
          status
        FROM users
        WHERE id = ?
        LIMIT 1
      `)
      .bind(session.id)
      .first();

    if (!user || user.status !== "active") {
      return Response.json(
        {
          success: false,
          error: "User inactive"
        },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    return Response.json(
      {
        success: false,
        error: "Session check failed"
      },
      { status: 401 }
    );
  }
}


// ======================================
// LOGOUT
// ======================================

export async function onRequestDelete() {

  const headers = new Headers({
    "Content-Type": "application/json"
  });

  headers.append(
    "Set-Cookie",
    "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
  );

  return new Response(
    JSON.stringify({
      success: true,
      message: "Logout successful"
    }),
    {
      status: 200,
      headers
    }
  );
}


// ======================================
// PASSWORD HASH
// ======================================

async function hashPassword(password) {

  const salt =
    crypto.getRandomValues(
      new Uint8Array(16)
    );

  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

  const bits =
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256"
      },
      key,
      256
    );

  return [
    "pbkdf2",
    PBKDF2_ITERATIONS,
    toHex(salt),
    toHex(new Uint8Array(bits))
  ].join("$");
}


// ======================================
// PASSWORD VERIFY
// ======================================

async function verifyPassword(
  password,
  storedHash
) {

  try {

    const parts =
      String(storedHash || "").split("$");

    if (
      parts.length !== 4 ||
      parts[0] !== "pbkdf2"
    ) {
      return false;
    }

    const iterations =
      Number(parts[1]);

    const salt =
      fromHex(parts[2]);

    const expected =
      fromHex(parts[3]);

    const key =
      await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
      );

    const bits =
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: iterations,
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


// ======================================
// SESSION TOKEN
// ======================================

async function createSessionToken(
  user,
  secret
) {

  const payload = {
    ...user,
    exp:
      Math.floor(Date.now() / 1000) +
      SESSION_DAYS * 86400
  };

  const encoded =
    base64url(
      JSON.stringify(payload)
    );

  const signature =
    await sign(encoded, secret);

  return `${encoded}.${signature}`;
}


async function verifySessionToken(
  token,
  secret
) {

  try {

    const parts =
      String(token).split(".");

    if (parts.length !== 2) {
      return null;
    }

    const payload =
      parts[0];

    const signature =
      parts[1];

    const expected =
      await sign(payload, secret);

    if (
      !timingSafeEqualString(
        signature,
        expected
      )
    ) {
      return null;
    }

    const data =
      JSON.parse(
        fromBase64url(payload)
      );

    if (
      !data.exp ||
      data.exp <
        Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return data;

  } catch {
    return null;
  }
}


// ======================================
// HMAC SHA-256
// ======================================

async function sign(
  value,
  secret
) {

  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(value)
    );

  return base64urlBytes(
    new Uint8Array(signature)
  );
}


// ======================================
// COOKIE
// ======================================

function parseCookies(cookieString) {

  const cookies = {};

  cookieString
    .split(";")
    .forEach(part => {

      const index =
        part.indexOf("=");

      if (index === -1) return;

      const key =
        part
          .slice(0, index)
          .trim();

      const value =
        part
          .slice(index + 1)
          .trim();

      cookies[key] = value;
    });

  return cookies;
}


// ======================================
// ENCODING HELPERS
// ======================================

function base64url(value) {

  return base64urlBytes(
    new TextEncoder().encode(value)
  );
}


function base64urlBytes(bytes) {

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}


function fromBase64url(value) {

  let base64 =
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  while (base64.length % 4) {
    base64 += "=";
  }

  const binary =
    atob(base64);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return new TextDecoder().decode(bytes);
}


function toHex(bytes) {

  return Array.from(bytes)
    .map(
      b =>
        b.toString(16)
          .padStart(2, "0")
    )
    .join("");
}


function fromHex(hex) {

  const bytes =
    new Uint8Array(
      hex.length / 2
    );

  for (
    let i = 0;
    i < bytes.length;
    i++
  ) {
    bytes[i] =
      parseInt(
        hex.substr(i * 2, 2),
        16
      );
  }

  return bytes;
}


function timingSafeEqual(a, b) {

  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (
    let i = 0;
    i < a.length;
    i++
  ) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}


function timingSafeEqualString(a, b) {

  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (
    let i = 0;
    i < a.length;
    i++
  ) {
    result |=
      a.charCodeAt(i) ^
      b.charCodeAt(i);
  }

  return result === 0;
}
