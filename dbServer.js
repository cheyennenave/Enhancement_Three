/*ENHANCEMENT 3: this file establishes connection to the database and the server so that the files are connected and served. */

const express = require("express");
const app = express();
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
require("dotenv").config();
const path = require("path");


const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PORT = Number(process.env.DB_PORT);

/*Created a pool for multiple connections with the info from the .env file. */
const db = mysql.createPool({
  connectionLimit: 10,
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  port: DB_PORT,
});

/*Test to ensure the database is connecting properly.*/
(async () => {
  try {
    const connection = await db.getConnection();
    console.log("DB connected successfully: " + connection.threadId);
    connection.release();
  } catch (err) {
    console.error("Failed to connect to DB:", err);
  }
})();

/*Middleware */
app.use(express.json());
app.use(express.static(path.join(__dirname, ".."))); /*Making sure my HTML, CSS, JS files are being served too. */


/*Testing the route to make sure the server is connecting properly. */
app.get("/", (req, res) => {
  res.send("Server is working!");
});

/*Route to create a user */
app.post("/createUser", async (req, res) => {
  console.log("Received POST /createUser");
  const user = req.body.name;
  const hashedPassword = await bcrypt.hash(req.body.password, 10); /*Using bcrypt to hash the passwords for better security. */

  try {
    const connection = await db.getConnection();

    const [result] = await connection.query( /*Checking to see if username is already taken. */
      "SELECT * FROM userTable WHERE user = ?",
      [user]
    );

    if (result.length !== 0) {
      connection.release();
      console.log("User already exists");
      return res.sendStatus(409); /*Send alert if username is already used. */
    }

    const [insertResult] = await connection.query(
      "INSERT INTO userTable (user, password) VALUES (?, ?)",
      [user, hashedPassword]
    );
    connection.release(); /*Making sure to release the database as not to compromise it. */

    console.log("Created new user, ID:", insertResult.insertId);
    res.sendStatus(201); /*Let's me know if the user was created successfully */
  } catch (err) {
    console.error("Error in /createUser:", err);
    res.status(500).send("Internal Server Error"); /*Let's me know if something goes wrong during creation so I won't have to skim multiple files. */
  }
});


// Route: Login User
app.post("/login", async (req, res) => {
  console.log("Received POST /login");
  const user = req.body.name;/*Get username and password. */
  const password = req.body.password;

  try {
    const connection = await db.getConnection();

    const [result] = await connection.query( /*Search for entered username. */
      "SELECT * FROM userTable WHERE user = ?",
      [user]
    );
    connection.release(); /*Releasing connection from database just like in createUser route. */

    if (result.length === 0) {
      console.log("User not found");
      return res.status(404).send("User not found"); /*Let's me know the user was not found. */
    }

    const hashedPassword = result[0].password; /*Retrieve the hashed password. */

    if (await bcrypt.compare(password, hashedPassword)) { /*If the password matches, the user is logged in. */
      console.log("Login successful");
      res.status(200).send("Login successful");
    } else {
      console.log("Incorrect password");
      res.status(401).send("Incorrect password");
    }
  } catch (err) {
    console.error("Error in /login:", err);
    res.status(500).send("Internal Server Error");
  }
});

/*Start the server on port 3000 */
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server started on port ${port}...`)); /*Let's me know the connection was successful */


