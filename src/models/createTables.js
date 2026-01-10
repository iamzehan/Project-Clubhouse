const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DB_URL_PROD,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function createTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 0. Extension
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS citext;
    `);

    // 1. users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        username CITEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. user_profile
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profile (
        user_id BIGINT PRIMARY KEY
          REFERENCES users(id)
          ON DELETE CASCADE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. clubs
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(150) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. clubs_members
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs_members (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        club_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_clubs_members_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
        CONSTRAINT fk_clubs_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT uq_club_user UNIQUE (club_id, user_id)
      );
    `);

    // 5. clubs_secret
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs_secret (
        club_id BIGINT PRIMARY KEY
          REFERENCES clubs(id)
          ON DELETE CASCADE,
        secret TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 6. clubs_image
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs_image (
        club_id BIGINT PRIMARY KEY
          REFERENCES clubs(id)
          ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 7. roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 8. user_roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, role_id)
      );
    `);

    // 9. club_roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_roles (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        description TEXT,
        club_id BIGINT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_club_role UNIQUE (club_id, name)
      );
    `);

    // 10. club_member_roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_member_roles (
        club_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        club_role_id BIGINT NOT NULL,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (club_id, user_id, club_role_id),
        CONSTRAINT fk_cmr_member FOREIGN KEY (club_id, user_id) REFERENCES clubs_members(club_id, user_id) ON DELETE CASCADE,
        CONSTRAINT fk_cmr_role FOREIGN KEY (club_role_id) REFERENCES club_roles(id) ON DELETE CASCADE
      );
    `);

    // 11. club_posts
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_posts (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        club_id BIGINT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 12. Insert default roles (safe because roles.updated_at has default NOW())
    await client.query(`
      INSERT INTO roles (name, description)
      VALUES
        ('super_admin', 'Full system access'),
        ('admin', 'System administrator'),
        ('moderator', 'Content moderator'),
        ('user', 'Default application user')
      ON CONFLICT (name) DO NOTHING;
    `);

    // 13. Trigger function for updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 14. Attach triggers (drop existing triggers first so script is re-runnable)
    const tablesWithUpdatedAt = [
      'users',
      'user_profile',
      'clubs',
      'clubs_members',
      'clubs_secret',
      'clubs_image',
      'roles',
      'club_roles',
      'club_posts'
    ];

    for (const table of tablesWithUpdatedAt) {
      // Drop any existing trigger with that name to make script idempotent
      await client.query(`DROP TRIGGER IF EXISTS trg_${table}_updated_at ON ${table};`);
      await client.query(`
        CREATE TRIGGER trg_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      `);
    }

    // 15. Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(user_id);
      CREATE INDEX IF NOT EXISTS idx_clubs_members_user_id ON clubs_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_clubs_members_club_id ON clubs_members(club_id);
      CREATE INDEX IF NOT EXISTS idx_clubs_secret_club_id ON clubs_secret(club_id);
      CREATE INDEX IF NOT EXISTS idx_clubs_image_club_id ON clubs_image(club_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
      CREATE INDEX IF NOT EXISTS idx_club_roles_club_id ON club_roles(club_id);
      CREATE INDEX IF NOT EXISTS idx_club_member_roles_user_id ON club_member_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_club_posts_club ON club_posts (club_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_club_posts_user ON club_posts (user_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Successfully created/ensured all tables, triggers, indexes, and default data.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error while creating tables:', err);
    throw err;
  } finally {
    client.release();
    await pool.end(); // ensure pool is closed before exit
  }
}

createTables()
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });