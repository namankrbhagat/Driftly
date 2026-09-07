require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

(async () => {
  try{
    const sql = fs.readFileSync(path.join(__dirname, "schema.sql"),"utf8");
    console.log("Initializing database schema...");
    await pool.query(sql);
    console.log("Database schema initialized successfully."); 
  }catch(err){
    console.error("Error initializing database schema:", err);
    process.exitCode = 1;
  }finally{
    await pool.end();
  }
})();


