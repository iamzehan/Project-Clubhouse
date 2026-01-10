const { Pool } = require("pg");
require("dotenv").config();
// DATABASE connection
const pool = new Pool((process.env.NODE_ENV==="development")?{
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
}:{
  connectionString: process.env.DB_URL_PROD}
);

module.exports = pool;