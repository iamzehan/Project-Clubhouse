const db = require("../models/queries");
const bcrypt = require("bcryptjs");
const passport = require("../auth/passport");

const pool = require("../models/pool");

exports.clubGet = async (req, res) => {
  const myClubs = await db.getUserClubsOrOwned(req.user.id);
  const otherClubs = await db.getClubsNotJoined(req.user.id);
  res.render("clubs", { myClubs, otherClubs });
};


exports.getClubPage = async (req, res) => {
  const myClubs = await db.getUserClubsOrOwned(req.user.id);
  const club = await db.getClubById(req.params.id);
  const profileImg = await db.getClubImage(req.params.id);
  const members = await db.getClubMembers(req.params.id);
  // mutate roles of members
  const members_roles = await Promise.all(
  members.map(async (member) => {
    const role = await db.getUserClubRoles(req.params.id, member.id);
    return { 
      ...member, 
      role: (role.includes("owner")?"owner"
      :(role.includes("admin")?"admin"
    :"member")) };
  })
  
);
  
  res.render("clubPosts", { myClubs, club, profileImg, members: members_roles });
};

exports.createClubGet = async (req, res) => {
  res.render("createClub", { error: null });
};

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
exports.joinClubGet = async (req, res) => {
  const image_url = await db.getClubImage(req.params.id);
  const club = await db.getClubById(req.params.id);
  const error = req.query?.error || null;
  res.render("joinClub", { clubId: req.params.id, name: club.name, image_url, error });
};

exports.joinClubPost = async (req, res) => {
  const clubId = req.params.id;
  const { secret } = req.body;
  const clubSecret = await db.getClubSecret(clubId);
  const varify = await bcrypt.compare(secret, clubSecret);
  if(varify){
    await db.addMemberToClub(clubId, req.user.id);
    res.redirect("/clubs");
  }else{
    res.redirect(`/clubs/join/${clubId}?error=Secret is wrong`)
  }
};
