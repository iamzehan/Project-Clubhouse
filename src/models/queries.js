const pool = require("./pool");
const formatPostDate = require("../utils/formatDate");
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
// get My clubs (member or owner)
exports.getUserClubsOrOwned = async (userId) => {
  const SQL = `
    SELECT
      c.id,
      c.name,
      c.created_at,
      ci.image_url,
      COALESCE(cr.name, 'member') AS user_role,
      COUNT(DISTINCT cm_all.user_id) AS total_members
    FROM clubs c

    -- user membership (optional)
    LEFT JOIN clubs_members cm_user
      ON cm_user.club_id = c.id
     AND cm_user.user_id = $1

    -- role of the user in this club
    LEFT JOIN club_member_roles cmr
      ON cmr.club_id = c.id
     AND cmr.user_id = $1
    LEFT JOIN club_roles cr
      ON cr.id = cmr.club_role_id

    -- all members for counting
    LEFT JOIN clubs_members cm_all
      ON cm_all.club_id = c.id

    -- club image
    LEFT JOIN clubs_image ci
      ON ci.club_id = c.id

    WHERE
      cm_user.user_id IS NOT NULL   -- member
      OR cr.name = 'owner'          -- owner

    GROUP BY
      c.id,
      c.name,
      c.created_at,
      ci.image_url,
      cr.name

    ORDER BY c.created_at DESC;
  `;

  const { rows } = await pool.query(SQL, [userId]);
  return rows.map(post => ({
  ...post,
  formattedDate: formatPostDate(post.created_at)
}));;
};


// get clubs I am not a member of

exports.getClubsNotJoined = async (userId) => {
  const SQL = `
SELECT
    c.id,
    c.name,
    ci.image_url,
    COUNT(cm.user_id) AS total_members
FROM clubs c
LEFT JOIN clubs_image ci
    ON ci.club_id = c.id
LEFT JOIN clubs_members cm
    ON cm.club_id = c.id
WHERE NOT EXISTS (
    SELECT 1
    FROM clubs_members cm2
    WHERE cm2.club_id = c.id
      AND cm2.user_id = $1
)
GROUP BY c.id, c.name, ci.image_url
ORDER BY c.created_at DESC;
  `;

  const { rows } = await pool.query(SQL, [userId]);
  return rows;
};


// All Posts in a club

// get all the posts
exports.getClubMessages = async (clubId) => {
  const SQL = `
    SELECT
      cp.id,
      cp.content,
      cp.created_at,
      u.id as member_id,
      u.username,
      up.first_name,
      up.last_name
    FROM club_posts cp
    JOIN users u ON u.id = cp.user_id
    LEFT JOIN user_profile up ON up.user_id = u.id
    WHERE cp.club_id = $1
    ORDER BY cp.created_at DESC;
  `;
  const { rows } = await pool.query(SQL, [clubId]);
  return rows.map(post => ({
  ...post,
  formattedDate: formatPostDate(post.created_at)
}));;
};

// Make Post to the club
exports.createClubMessage = async (clubId, userId, content) => {
  const SQL = `
    INSERT INTO club_posts (club_id, user_id, content)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const { rows } = await pool.query(SQL, [clubId, userId, content]);
  return rows[0];
};


// Get all posts of a club
exports.getAllClubMessages = async() => {
  const SQL = `
    SELECT * FROM club_posts ORDER BY created_at DESC;
  `
  const { rows } = await pool.query(SQL);
  return rows;
}

// get user Profile 
exports.getUserProfile = async(userId) => {
  const SQL = `SELECT * FROM user_profile WHERE user_id=$1`;
  const {rows} = await pool.query(SQL, [userId]);
  return rows[0];
}

// get a post
exports.getClubPost = async(clubId, postId) => {
  const SQL = `SELECT * FROM club_posts WHERE club_id=$1 AND id=$2`;
  const {rows} = await pool.query(SQL, [clubId, postId]);
  return rows[0];
}

// update a post
exports.updateClubPost = async(postId,clubId, content) => {
  const SQL = `UPDATE club_posts SET content=$3 WHERE id=$1 AND club_id=$2 RETURNING *`;
  const {rows} = await pool.query(SQL, [postId, clubId, content]);
  return rows.length > 0;
}

// delete a post
exports.deleteClubPost = async(postId, clubId) => {
  const SQL = `DELETE from club_posts WHERE id=$1 AND club_id=$2 RETURNING *`;
  const {rows} = await pool.query(SQL, [postId, clubId]);
  return rows.length > 0;
}