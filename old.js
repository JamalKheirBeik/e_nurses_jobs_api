const express = require("express");
const app = express();
const mysql = require("mysql");
const crypto = require("crypto");
const cors = require("cors");
require("dotenv").config(); // env variables

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// admin authorization middleware
const auth = (req, res, next) => {
  try {
    const admin_id = req.body.admin_id;
    if (!admin_id) return res.json({ data: [] });
    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      const authQuery = `SELECT ID FROM admins WHERE ID = ${admin_id}`;
      con.query(authQuery, (err, result) => {
        con.destroy();
        if (err) return res.json({ error: "General error" });
        if (result.length == 0) return res.json({ error: "Not authorized" });
        next();
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
};

// nurse login
app.post("/login", (req, res) => {
  try {
    const phone = req.body.phone;
    const password = req.body.password;
    if (!phone) return res.json({ error: "Phone cannot be empty" });
    if (!password) return res.json({ error: "Password cannot be empty" });
    const hashedPassword = crypto
      .createHash("md5")
      .update(password)
      .digest("hex");

    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      const query =
        "SELECT ID, name, gender, phone FROM nurses WHERE phone = ? AND password = ? AND isResigned = ?";
      con.query(query, [phone, hashedPassword, 0], (err, result, fields) => {
        con.destroy();
        if (err) return res.json({ error: "General error" });
        if (result.length == 0)
          return res.json({ error: "Incorrect phone and/or password." });
        res.json(result[0]);
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
});

// request daily report
app.post("/getDailyReport", (req, res) => {
  try {
    const nurse_id = req.body.nurse_id;
    const today = new Date();
    const date = `${today.getFullYear()}-${
      today.getMonth() + 1
    }-${today.getDate()}`;

    if (!nurse_id) return res.json({ error: "Nurse ID cannot be empty" });

    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      let query = `SELECT t.ID, ct.name caring_type, p.name patient, p.room, DATE_FORMAT(t.time, '%H:%i:%s') time,t.description
                   FROM caring t
                   INNER JOIN caring_type ct ON t.caring_type_id = ct.ID
                   INNER JOIN patients p ON t.patient_id = p.ID
                   WHERE t.nurse_id = ${nurse_id} AND DATE(t.time) = '${date}'
                   ORDER BY t.time ASC`;
      con.query(query, (err, result, fields) => {
        con.destroy();
        if (err) return res.json({ error: "General error" });
        res.json({ data: result });
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
});

// admin login
app.post("/admin/login", (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;
    if (!username) return res.json({ error: "Username cannot be empty" });
    if (!password) return res.json({ error: "Password cannot be empty" });
    const hashedPassword = crypto
      .createHash("md5")
      .update(password)
      .digest("hex");

    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      const query = "SELECT ID FROM admins WHERE username = ? AND password = ?";
      con.query(query, [username, hashedPassword], (err, result, fields) => {
        con.destroy();
        if (err) return res.json({ error: "General error" });
        if (result.length == 0)
          return res.json({ error: "Incorrect phone and/or password." });
        res.json(result[0]);
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
});

// add admins
app.post("/admin/add/admin", auth, (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;
    if (!username) return res.json({ error: "Username cannot be empty" });
    if (!password) return res.json({ error: "Password cannot be empty" });
    const hashedPassword = crypto
      .createHash("md5")
      .update(password)
      .digest("hex");

    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      const query = "INSERT INTO admins (username, password) VALUES ?";
      const values = [[username, hashedPassword]];
      con.query(query, [values], (err, result) => {
        con.destroy();
        if (err?.code === "ER_DUP_ENTRY")
          return res.json({ error: "Username is taken" });
        if (err) return res.json({ error: "General error" });
        res.json({ ID: result.insertId, message: "1 record inserted." });
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
});

// add nurses
app.post("/admin/add/nurse", auth, (req, res) => {
  try {
    const name = req.body.name;
    const gender = req.body.gender;
    const phone = req.body.phone;
    const password = req.body.password;
    if (!name) return res.json({ error: "Name cannot be empty" });
    if (!gender) return res.json({ error: "Gender cannot be empty" });
    if (!phone) return res.json({ error: "Phone cannot be empty" });
    if (!password) return res.json({ error: "Password cannot be empty" });
    const hashedPassword = crypto
      .createHash("md5")
      .update(password)
      .digest("hex");

    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      const query =
        "INSERT INTO nurses (name, gender, phone, password) VALUES ?";
      const values = [[name, gender, phone, hashedPassword]];
      con.query(query, [values], (err, result) => {
        con.destroy();
        if (err?.code === "ER_DUP_ENTRY")
          return res.json({ error: "Phone number is taken" });
        if (err) return res.json({ error: "General error" });
        res.json({ ID: result.insertId, message: "1 record inserted." });
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
});

// add patients
app.post("/admin/add/patient", auth, (req, res) => {
  try {
    const name = req.body.name;
    const room = req.body.room;
    const photo = req.body.photo;
    if (!name) return res.json({ error: "Name cannot be empty" });
    if (!room) return res.json({ error: "Room cannot be empty" });

    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      const query = "INSERT INTO patients (name, room, photo) VALUES ?";
      const values = [[name, room, photo]];
      con.query(query, [values], (err, result) => {
        con.destroy();
        if (err?.code === "ER_DUP_ENTRY")
          return res.json({ error: "Name is taken" });
        if (err) return res.json({ error: "General error" });
        res.json({ ID: result.insertId, message: "1 record inserted." });
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
});

// add caring
app.post("/admin/add/caring", auth, (req, res) => {
  try {
    const nurse_id = req.body.nurse_id;
    const caring_type_id = req.body.caring_type_id;
    const patient_id = req.body.patient_id;
    const time = req.body.time;
    const description = req.body.description;
    if (!nurse_id) return res.json({ error: "Nurse ID cannot be empty" });
    if (!caring_type_id)
      return res.json({ error: "Caring type ID cannot be empty" });
    if (!patient_id) return res.json({ error: "Patient ID cannot be empty" });
    if (!time) return res.json({ error: "Time cannot be empty" });
    if (!description) return res.json({ error: "Description cannot be empty" });

    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      const query =
        "INSERT INTO caring (nurse_id, caring_type_id, patient_id, time, description) VALUES ?";
      const values = [
        [nurse_id, caring_type_id, patient_id, time, description],
      ];
      con.query(query, [values], (err, result) => {
        con.destroy();
        if (err) return res.json({ error: "General error" });
        res.json({ ID: result.insertId, message: "1 record inserted." });
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
});

// add caring types
app.post("/admin/add/caringType", auth, (req, res) => {
  try {
    const name = req.body.name;
    const description = req.body.description;
    if (!name) return res.json({ error: "Name cannot be empty" });
    if (!description) return res.json({ error: "Description cannot be empty" });

    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      const query = "INSERT INTO caring_type (name, description) VALUES ?";
      const values = [[name, description]];
      con.query(query, [values], (err, result) => {
        con.destroy();
        if (err?.code === "ER_DUP_ENTRY")
          return res.json({ error: "Name is taken" });
        if (err) return res.json({ error: "General error" });
        res.json({ ID: result.insertId, message: "1 record inserted." });
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
});

// edit nurses
app.post("/admin/edit/nurse", auth, (req, res) => {
  try {
    const nurse_id = req.body.nurse_id;
    const name = req.body.name;
    const gender = req.body.gender;
    const phone = req.body.phone;
    const password = req.body.password;
    const isResigned = req.body.isResigned;
    if (!nurse_id) return res.json({ error: "Nurse ID cannot be empty" });
    if (!name) return res.json({ error: "Name cannot be empty" });
    if (!gender) return res.json({ error: "Gender cannot be empty" });
    if (!phone) return res.json({ error: "Phone cannot be empty" });
    if (!isResigned)
      return res.json({ error: "Is resigned flag cannot be empty" });

    var hashedPassword;
    if (password) {
      hashedPassword = crypto.createHash("md5").update(password).digest("hex");
    }

    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      var query, values;
      if (password) {
        query =
          "UPDATE nurses SET name = ?,gender = ?, phone = ?, password = ?, isResigned = ? WHERE ID = ?";
        values = [name, gender, phone, hashedPassword, isResigned, nurse_id];
      } else {
        query =
          "UPDATE nurses SET name = ?,gender = ?, phone = ?, isResigned = ? WHERE ID = ?";
        values = [name, gender, phone, isResigned, nurse_id];
      }
      con.query(query, values, (err, result) => {
        con.destroy();
        if (err) return res.json({ error: "General error" });
        if (result.affectedRows == 0)
          return res.json({ error: "Nurse not found." });
        res.json({ message: "1 record updated." });
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
});

// edit patients
app.post("/admin/edit/patient", auth, (req, res) => {
  try {
    const patient_id = req.body.patient_id;
    const name = req.body.name;
    const room = req.body.room;
    const photo = req.body.photo;
    const isStopped = req.body.isStopped;
    if (!patient_id) return res.json({ error: "Patient ID cannot be empty" });
    if (!name) return res.json({ error: "Name cannot be empty" });
    if (!room) return res.json({ error: "Room cannot be empty" });
    if (!isStopped)
      return res.json({ error: "Is stopped flag cannot be empty" });

    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      const query =
        "UPDATE patients SET name = ?, room = ?, photo = ?, isStopped = ? WHERE ID = ?";
      const values = [name, room, photo, isStopped, patient_id];
      con.query(query, values, (err, result) => {
        con.destroy();
        if (err) return res.json({ error: "General error" });
        if (result.affectedRows == 0)
          return res.json({ error: "Patient not found." });
        res.json({ message: "1 record updated." });
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
});

// edit caring
app.post("/admin/edit/caring", auth, (req, res) => {
  try {
    const caring_id = req.body.caring_id;
    const nurse_id = req.body.nurse_id;
    const caring_type_id = req.body.caring_type_id;
    const patient_id = req.body.patient_id;
    const time = req.body.time;
    const description = req.body.description;
    if (!caring_id) return res.json({ error: "Caring ID cannot be empty" });
    if (!nurse_id) return res.json({ error: "Nurse ID cannot be empty" });
    if (!caring_type_id)
      return res.json({ error: "Caring type ID cannot be empty" });
    if (!patient_id) return res.json({ error: "Patient ID cannot be empty" });
    if (!time) return res.json({ error: "Time cannot be empty" });
    if (!description) return res.json({ error: "Description cannot be empty" });

    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      const query =
        "UPDATE caring SET nurse_id = ?, caring_type_id = ?, patient_id = ?, time = ?, description = ? WHERE ID = ?";
      const values = [
        nurse_id,
        caring_type_id,
        patient_id,
        time,
        description,
        caring_id,
      ];
      con.query(query, values, (err, result) => {
        con.destroy();
        if (err) return res.json({ error: "General error" });
        if (result.affectedRows == 0)
          return res.json({ error: "Caring not found." });
        res.json({ message: "1 record updated." });
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
});

// edit caring types
app.post("/admin/edit/caringType", auth, (req, res) => {
  try {
    const caring_type_id = req.body.caring_type_id;
    const name = req.body.name;
    const description = req.body.description;
    if (!caring_type_id)
      return res.json({ error: "Caring type ID cannot be empty" });
    if (!name) return res.json({ error: "Name cannot be empty" });
    if (!description) return res.json({ error: "Description cannot be empty" });

    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      const query =
        "UPDATE caring_type SET name = ?, description = ? WHERE ID = ?";
      const values = [name, description, caring_type_id];
      con.query(query, values, (err, result) => {
        con.destroy();
        if (err) return res.json({ error: "General error" });
        if (result.affectedRows == 0)
          return res.json({ error: "Caring type not found." });
        res.json({ message: "1 record updated." });
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
});

// search for nurses, patients, carings, caring types
app.post("/admin/search", auth, (req, res) => {
  try {
    const searchFor = req.body.searchFor; // 0 => nurses, 1 => patients, 2 => caring, 3 => caring types, 4 => admins
    const searchQuery = req.body.searchQuery.toLowerCase();
    if (!searchFor) return res.json({ error: "'Search for' cannot be empty" });

    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.db_password,
      database: process.env.db_name,
    });
    con.connect((err) => {
      if (err) return res.json({ error: "General error" });
      let query = "";
      switch (searchFor) {
        case "0": // nurses
          query = `SELECT ID, name, gender, phone, isResigned
                   FROM nurses
                   WHERE LOWER(name) LIKE '%${searchQuery}%'
                   ORDER BY ID ASC`;
          break;
        case "1": // patients
          query = `SELECT ID, name, room, photo, isStopped
                   FROM patients
                   WHERE LOWER(name) LIKE '%${searchQuery}%'
                   ORDER BY ID ASC`;
          break;
        case "2": // carings
          query = `SELECT t.ID, t.nurse_id, n.name nurse, t.caring_type_id,
                          ct.name caring_type, t.patient_id, p.name patient, t.time, t.description
                   FROM caring t
                   INNER JOIN nurses n ON t.nurse_id = n.ID
                   INNER JOIN caring_type ct ON t.caring_type_id = ct.ID
                   INNER JOIN patients p ON t.patient_id = p.ID
                   WHERE LOWER(n.name) LIKE '%${searchQuery}%'
                         OR LOWER(ct.name) LIKE '%${searchQuery}%'
                         OR LOWER(p.name) LIKE '%${searchQuery}%'
                   ORDER BY t.ID ASC`;
          break;
        case "3": // caring types
          query = `SELECT ID, name, description
                   FROM caring_type
                   WHERE LOWER(name) LIKE '%${searchQuery}%'
                   ORDER BY ID ASC`;
          break;
        case "4": // admins
          query = `SELECT ID, username
                   FROM admins
                   WHERE LOWER(username) LIKE '%${searchQuery}%'
                   ORDER BY ID ASC`;
          break;
      }
      con.query(query, (err, result, fields) => {
        con.destroy();
        if (err) return res.json({ error: "General error" });
        res.json({ data: result });
      });
    });
  } catch (e) {
    res.json({ error: "General error" });
  }
});

// 404
app.get("*", (req, res) => {
  res.json({ error: "404 not found." });
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
