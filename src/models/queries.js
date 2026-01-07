const pool = require("./pool");

exports.getAllUsers = async() => {
  const SQL = "SELECT username from users";
  const {rows} = await pool.query(SQL);
  return rows;
}

exports.createUser = async (username, password) => {
  const SQL = "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *";
  const {rows} = await pool.query(SQL, [username, password]);
  return rows[0].id;
};
exports.createProfile = async(userId, firstname, lastname)=> {
  const SQL = "INSERT INTO user_profile(first_name, last_name, user_id) VALUES ($1,$2,$3) RETURNING *";
  const {rows} = await pool.query(SQL, [firstname, lastname, userId]);
  return rows.length > 0;
}

exports.getUser = async (username) => {
  const SQL = `SELECT * FROM users WHERE username = $1`
  const {rows} = await pool.query(SQL, [username]);
  return rows[0];
}

exports.getUserById = async (id) => {
  const SQL = `SELECT * FROM users WHERE id=$1`
  const {rows} = await pool.query(SQL, [id]);
  return rows[0];
}