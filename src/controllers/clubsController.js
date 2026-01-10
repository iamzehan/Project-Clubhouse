const db = require("../models/queries");
const bcrypt = require("bcryptjs");
const passport = require("../auth/passport");

const pool = require("../models/pool");
const formatPostDate = require("../utils/formatDate");

// Inbox get

exports.inboxGET = async (req, res) => {
  const posts = await db.getAllClubMessages();
  const postsDetails = await Promise.all(
    posts.map(async (post) => {
      const club = await db.getClubById(post.club_id);
      const isMember = (req.user)? await db.isUserClubMember(post.club_id, req.user.id):null;
      const row = {...post, isMember, club_name: club.name};
      if (isMember) {
        const role = await db.getUserClubRoles(post.club_id, post.user_id);
        const user = await db.getUserById(post.user_id);
        const userProfile = await db.getUserProfile(post.user_id);
        row.formattedDate = formatPostDate(post.created_at);
        row.first_name = userProfile.first_name;
        row.last_name = userProfile.last_name;
        row.username = user.username;
        row.role = role.includes("owner")
          ? "owner"
          : role.includes("admin")
          ? "admin"
          : "member";
      }
      return row;
    })
  );
  // res.json(posts_members)
  res.render("inbox", {posts: postsDetails});
};
// get available clubs
exports.clubGet = async (req, res) => {
  const myClubs = await db.getUserClubsOrOwned(req.user.id);
  const otherClubs = await db.getClubsNotJoined(req.user.id);
  res.render("clubs", { myClubs, otherClubs });
};

// ACCESS THE CLUB PAGE

// get request
exports.getClubPage = async (req, res) => {
  const club = await db.getClubById(req.params.id);
  const profileImg = await db.getClubImage(req.params.id);
  const members = await db.getClubMembers(req.params.id);
  const posts = await db.getClubMessages(req.params.id);
  if(!req.user){
    res.render("clubPosts", {
    myClubs:null,
    club,
    profileImg,
    members: null,
    total_members: members.length,
    isMember:null,
    posts,
    })
  }
  const posts_roles = await Promise.all(
    posts.map(async (post) => {
      const role = await db.getUserClubRoles(req.params.id, post.member_id);
      return {
        ...post,
        role: role.includes("owner")
          ? "owner"
          : role.includes("admin")
          ? "admin"
          : "member",
      };
    })
  );
  const isMember = await db.isUserClubMember(req.params.id, req.user.id);
  let members_roles = null;
  let myClubs = null;
  // if the user is a member then do the following query
  if (isMember) {
    myClubs = await db.getUserClubsOrOwned(req.user.id);
    // mutate roles of members
    members_roles = await Promise.all(
      members.map(async (member) => {
        const role = await db.getUserClubRoles(req.params.id, member.id);
        return {
          ...member,
          role: role.includes("owner")
            ? "owner"
            : role.includes("admin")
            ? "admin"
            : "member",
        };
      })
    );
    // rearrange so that the logged in user is at the top
    members_roles = [
      members_roles.find((member) => member.id === req.user.id),
      ...members_roles.filter((member) => member.id !== req.user.id),
    ];
  }

  res.render("clubPosts", {
    myClubs,
    club,
    profileImg,
    members: members_roles,
    total_members: members.length,
    isMember,
    posts: posts_roles,
  });
};

// CREATE A MESSAGE/POST TO THE CLUB - DATABASE TABLE IS club_posts

// post request
exports.createClubMessagePOST = async (req, res) => {
  const isMember = await db.isUserClubMember(req.params.id, req.user.id);
  if (!isMember) {
    return res.status(403).send("Only members can post");
  }

  await db.createClubMessage(req.params.id, req.user.id, req.body.content);
  res.redirect(`/clubs/${req.params.id}`);
};

// CREATE A CLUB

// get request
exports.createClubGet = async (req, res) => {
  res.render("createClub", { error: null });
};
// post request
exports.createClubPost = async (req, res) => {
  const { name, secret, image_url } = req.body;
  const userId = req.user.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!name || name.trim().length < 3) {
    return res
      .status(400)
      .json({ error: "Club name must be at least 3 characters" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Create the club
    const clubId = await db.createClub(name);

    // 2. Add creator as a member
    await db.addMemberToClub(clubId, userId);

    // 3. Create default roles (owner/admin/member)
    await db.createDefaultClubRoles(clubId);

    // 4. Assign owner role to creator
    await db.assignClubRole(clubId, userId, "owner");

    // 5. Optional: Add secret
    if (secret && secret.trim() !== "") {
      await db.createClubSecret(clubId, secret);
    }

    // 6. Optional: Add image
    if (image_url && image_url.trim() !== "") {
      await db.createClubImage(clubId, image_url);
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Club created successfully",
      clubId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating club:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

// JOIN A CLUB

// get request
exports.joinClubGet = async (req, res) => {
  const image_url = await db.getClubImage(req.params.id);
  const club = await db.getClubById(req.params.id);
  const error = req.query?.error || null;
  res.render("joinClub", {
    clubId: req.params.id,
    name: club.name,
    image_url,
    error,
  });
};

// post request
exports.joinClubPost = async (req, res) => {
  const clubId = req.params.id;
  const { secret } = req.body;
  const clubSecret = await db.getClubSecret(clubId);
  const varify = await bcrypt.compare(secret, clubSecret);
  if (varify) {
    await db.addMemberToClub(clubId, req.user.id);
    res.redirect("/clubs");
  } else {
    res.redirect(`/clubs/join/${clubId}?error=Secret is wrong`);
  }
};
