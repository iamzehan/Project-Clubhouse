const { Client } = require("pg");
require("dotenv").config();

const client = new Client(
  process.env.NODE_ENV === "development"
    ? {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
    : {
        connectionString: process.env.DB_URL_PROD,
      }
);

async function createSessionTable() {
  try {
    // Connect to the database
    await client.connect();
    console.log("Connected to PostgreSQL");

    // SQL query to create session table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        PRIMARY KEY ("sid")
      );

      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `;

    // Execute the query
    await client.query(createTableQuery);
    console.log("Session table created successfully");
  } catch (err) {
    console.error("Error creating session table:", err);
  } finally {
    // Disconnect from the database
    await client.end();
    console.log("Disconnected from PostgreSQL");
  }
}

// Run the function
createSessionTable();
