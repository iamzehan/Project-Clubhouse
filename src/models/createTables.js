const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function initSchema() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* =========================
       USERS
    ========================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        username VARCHAR(150) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    /* =========================
       USER PROFILE (1–1)
    ========================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        user_id BIGINT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_user_profile_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);

    /* =========================
       CLUBS
    ========================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(150) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    /* =========================
       CLUB MEMBERS (M–M)
    ========================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs_members (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        club_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_clubs_members_club
          FOREIGN KEY (club_id)
          REFERENCES clubs(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_clubs_members_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE,
        CONSTRAINT uq_club_user UNIQUE (club_id, user_id)
      );
    `);

    /* =========================
       CLUB SECRET (1–1)
    ========================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs_secret (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        secret TEXT NOT NULL,
        club_id BIGINT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_clubs_secret_club
          FOREIGN KEY (club_id)
          REFERENCES clubs(id)
          ON DELETE CASCADE
      );
    `);

    /* =========================
       CLUB IMAGE (1–1)
    ========================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs_image (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        image_url TEXT NOT NULL,
        club_id BIGINT NOT NULL UNIQUE,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_clubs_image_club
          FOREIGN KEY (club_id)
          REFERENCES clubs(id)
          ON DELETE CASCADE
      );
    `);

    /* =========================
       GLOBAL ROLES
    ========================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    /* =========================
       CLUB ROLES
    ========================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_roles (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT
      );
    `);

    /* =========================
       CLUB MEMBER ROLES
    ========================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_member_roles (
        club_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        club_role_id BIGINT NOT NULL,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (club_id, user_id),
        FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (club_role_id) REFERENCES club_roles(id)
      );
    `);

    /* =========================
       CLUB POSTS
    ========================= */
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_posts (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        club_id BIGINT NOT NULL,
        author_id BIGINT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    /* =========================
       UPDATED_AT TRIGGER FN
    ========================= */
    await client.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    /* =========================
       ATTACH TRIGGERS
    ========================= */
    await client.query(`
      DO $$
      DECLARE
        tbl RECORD;
      BEGIN
        FOR tbl IN
          SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        LOOP
          EXECUTE format(
            'CREATE TRIGGER trg_%1$s_updated_at
             BEFORE UPDATE ON %1$s
             FOR EACH ROW
             EXECUTE FUNCTION set_updated_at();',
            tbl.tablename
          );
        END LOOP;
      END $$;
    `);

    /* =========================
       DEFAULT CLUB ROLES
    ========================= */
    await client.query(`
      INSERT INTO club_roles (name, description)
      VALUES
        ('owner', 'Club owner'),
        ('member', 'Regular member')
      ON CONFLICT (name) DO NOTHING;
    `);

    await client.query("COMMIT");
    console.log("✅ Schema initialized successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Schema init failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

/* Run directly */
if (require.main === module) {
  initSchema()
    .then(() => pool.end())
    .catch(() => pool.end());
}

module.exports = initSchema;