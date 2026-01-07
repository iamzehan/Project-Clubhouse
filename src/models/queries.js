const pool = require("./pool");

exports.getAllUsers = async () => {
  const SQL = "SELECT username from users";
  const { rows } = await pool.query(SQL);
  return rows;
};

exports.createUser = async (username, password) => {
  const SQL =
    "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *";
  const { rows } = await pool.query(SQL, [username, password]);
  return rows[0].id;
};
exports.createProfile = async (userId, firstname, lastname) => {
  const SQL =
    "INSERT INTO user_profile(first_name, last_name, user_id) VALUES ($1,$2,$3) RETURNING *";
  const { rows } = await pool.query(SQL, [firstname, lastname, userId]);
  return rows.length > 0;
};

exports.getUser = async (username) => {
  const SQL = `SELECT * FROM users WHERE username = $1`;
  const { rows } = await pool.query(SQL, [username]);
  return rows[0];
};

exports.getUserById = async (id) => {
  const SQL = `SELECT * FROM users WHERE id=$1`;
  const { rows } = await pool.query(SQL, [id]);
  return rows[0];
};

/* =========================
   CLUBS
========================= */

// Get all clubs
exports.getAllClubs = async () => {
  const SQL = `SELECT * FROM clubs ORDER BY created_at DESC`;
  const { rows } = await pool.query(SQL);
  return rows;
};

// Get single club by id
exports.getClubById = async (clubId) => {
  const SQL = `SELECT * FROM clubs WHERE id = $1`;
  const { rows } = await pool.query(SQL, [clubId]);
  return rows[0];
};

// Get single club by name
exports.getClubByName = async (name) => {
  const SQL = `SELECT * FROM clubs WHERE name = $1`;
  const { rows } = await pool.query(SQL, [name]);
  return rows[0];
};

// Create club
exports.createClub = async (name) => {
  const SQL = `
    INSERT INTO clubs (name)
    VALUES ($1)
    RETURNING id
  `;
  const { rows } = await pool.query(SQL, [name]);
  return rows[0].id;
};

// Delete club
exports.deleteClub = async (clubId) => {
  const SQL = `DELETE FROM clubs WHERE id = $1`;
  await pool.query(SQL, [clubId]);
};

/* =========================
   CLUB MEMBERS
========================= */

// Add user to club
exports.addMemberToClub = async (clubId, userId) => {
  const SQL = `
    INSERT INTO clubs_members (club_id, user_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
  `;
  await pool.query(SQL, [clubId, userId]);
};

// Remove user from club
exports.removeMemberFromClub = async (clubId, userId) => {
  const SQL = `
    DELETE FROM clubs_members
    WHERE club_id = $1 AND user_id = $2
  `;
  await pool.query(SQL, [clubId, userId]);
};

// Get all members of a club
exports.getClubMembers = async (clubId) => {
  const SQL = `
    SELECT u.id, u.username, cm.joined_at
    FROM clubs_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.club_id = $1
    ORDER BY cm.joined_at
  `;
  const { rows } = await pool.query(SQL, [clubId]);
  return rows;
};

// Check if user is member
exports.isUserClubMember = async (clubId, userId) => {
  const SQL = `
    SELECT 1
    FROM clubs_members
    WHERE club_id = $1 AND user_id = $2
  `;
  const { rows } = await pool.query(SQL, [clubId, userId]);
  return rows.length > 0;
};

/* =========================
   CLUB ROLES
========================= */

// Create default roles for a club
exports.createDefaultClubRoles = async (clubId) => {
  const SQL = `
    INSERT INTO club_roles (club_id, name, description)
    VALUES
      ($1, 'owner',  'Club owner with full permissions'),
      ($1, 'admin',  'Club administrator'),
      ($1, 'member', 'Standard club member')
    ON CONFLICT (club_id, name) DO NOTHING
  `;
  await pool.query(SQL, [clubId]);
};

// Assign club role to member
exports.assignClubRole = async (clubId, userId, roleName) => {
  const SQL = `
    INSERT INTO club_member_roles (club_id, user_id, club_role_id)
    SELECT
      $1,
      $2,
      cr.id
    FROM club_roles cr
    WHERE cr.club_id = $1 AND cr.name = $3
    ON CONFLICT DO NOTHING
  `;
  await pool.query(SQL, [clubId, userId, roleName]);
};

// Get roles of a user in a club
exports.getUserClubRoles = async (clubId, userId) => {
  const SQL = `
    SELECT cr.name
    FROM club_member_roles cmr
    JOIN club_roles cr ON cr.id = cmr.club_role_id
    WHERE cmr.club_id = $1 AND cmr.user_id = $2
  `;
  const { rows } = await pool.query(SQL, [clubId, userId]);
  return rows.map((r) => r.name);
};

/* =========================
   CLUB SECRET
========================= */

// Create club secret
exports.createClubSecret = async (clubId, secret) => {
  const SQL = `
    INSERT INTO clubs_secret (club_id, secret)
    VALUES ($1, $2)
    ON CONFLICT (club_id) DO NOTHING
  `;
  await pool.query(SQL, [clubId, secret]);
};

// Get club secret
exports.getClubSecret = async (clubId) => {
  const SQL = `
    SELECT secret
    FROM clubs_secret
    WHERE club_id = $1
  `;
  const { rows } = await pool.query(SQL, [clubId]);
  return rows[0]?.secret;
};

/* =========================
   CLUB IMAGE
========================= */

// Create club image
exports.createClubImage = async (clubId, imageUrl) => {
  const SQL = `
    INSERT INTO clubs_image (club_id, image_url)
    VALUES ($1, $2)
    ON CONFLICT (club_id) DO NOTHING
  `;
  await pool.query(SQL, [clubId, imageUrl]);
};

// Get club image
exports.getClubImage = async (clubId) => {
  const SQL = `
    SELECT image_url
    FROM clubs_image
    WHERE club_id = $1
  `;
  const { rows } = await pool.query(SQL, [clubId]);
  return rows[0]?.image_url;
};

/* =========================
   AGGREGATES / VIEWS
========================= */

// Get clubs a user belongs to
exports.getUserClubs = async (userId) => {
  const SQL = `
    SELECT c.*
    FROM clubs_members cm
    JOIN clubs c ON c.id = cm.club_id
    WHERE cm.user_id = $1
    ORDER BY cm.joined_at DESC
  `;
  const { rows } = await pool.query(SQL, [userId]);
  return rows;
};

// Get club with member count
exports.getClubWithMemberCount = async (clubId) => {
  const SQL = `
    SELECT c.*, COUNT(cm.user_id)::int AS member_count
    FROM clubs c
    LEFT JOIN clubs_members cm ON cm.club_id = c.id
    WHERE c.id = $1
    GROUP BY c.id
  `;
  const { rows } = await pool.query(SQL, [clubId]);
  return rows[0];
};

// get My clubs
exports.getUserClubsOrOwned = async (userId) => {
  const SQL = `
    SELECT DISTINCT
    c.*,
    ci.image_url,
    COALESCE(cr.name, 'member') AS user_role
FROM clubs c
JOIN clubs_members cm ON cm.club_id = c.id
LEFT JOIN club_member_roles cmr ON cmr.club_id = c.id AND cmr.user_id = cm.user_id
LEFT JOIN club_roles cr ON cr.id = cmr.club_role_id
LEFT JOIN clubs_image ci ON ci.club_id = c.id
WHERE cm.user_id = $1
   OR (cmr.user_id = $1 AND cr.name = 'owner')
ORDER BY c.created_at DESC;
  `;
  const { rows } = await pool.query(SQL, [userId]);
  return rows;
};

// get clubs I am not a member of

exports.getClubsNotJoined = async (userId) => {
  const SQL = `
   SELECT c.*,ci.image_url
    FROM clubs as c
    LEFT JOIN clubs_members as cm
    ON c.id = cm.club_id
    LEFT JOIN clubs_image as ci
    ON c.id = ci.club_id
    WHERE cm.user_id != $1
    ORDER BY c.created_at DESC;
   `;
  const { rows } = await pool.query(SQL, [userId]);
  return rows;
};
