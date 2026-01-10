const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_PROD,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function createTables() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* ================= USERS ================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    /* ================= USER PROFILE ================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    /* ================= SYSTEM ROLES ================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(30) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    /* ================= CLUBS ================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        secret_hash TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    /* ================= CLUB IMAGE ================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs_image (
        id SERIAL PRIMARY KEY,
        club_id INTEGER UNIQUE NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    /* ================= CLUB MEMBERS ================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs_members (
        club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (club_id, user_id)
      );
    `);

    /* ================= CLUB ROLES ================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(30) UNIQUE NOT NULL,
        description TEXT
      );
    `);

    /* ================= CLUB MEMBER ROLES ================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_member_roles (
        club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        club_role_id INTEGER NOT NULL REFERENCES club_roles(id),
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (club_id, user_id)
      );
    `);

    /* ================= CLUB POSTS ================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_posts (
        id SERIAL PRIMARY KEY,
        club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    /* ================= POST REACTIONS ================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_post_reactions (
        post_id INTEGER NOT NULL REFERENCES club_posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reaction VARCHAR(20) NOT NULL,
        reacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (post_id, user_id)
      );
    `);

    /* ================= INDEXES ================= */
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_club_members_user ON clubs_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_club_members_club ON clubs_members(club_id);
      CREATE INDEX IF NOT EXISTS idx_club_posts_club ON club_posts(club_id);
      CREATE INDEX IF NOT EXISTS idx_club_posts_author ON club_posts(author_id);
    `);

    /* ================= DEFAULT CLUB ROLES ================= */
    await client.query(`
      INSERT INTO club_roles (name, description)
      VALUES 
        ('owner', 'Full control of the club'),
        ('moderator', 'Manages posts and members'),
        ('member', 'Regular club member')
      ON CONFLICT (name) DO NOTHING;
    `);

    await client.query("COMMIT");
    console.log("✅ Database schema created successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Schema creation failed:", err);
  } finally {
    client.release();
  }
}

/* Run directly */
if (require.main === module) {
  createTables()
    .then(() => pool.end())
    .catch(err => {
      console.error(err);
      pool.end();
    });
}

module.exports = createTables;