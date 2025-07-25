import express from "express";
import bodyParser from "body-parser";
import admin from "firebase-admin";
import cors from "cors";
import fs from "fs";

// Load service account key
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://schools-cdce8-default-rtdb.firebaseio.com"
});

const db = admin.database();
const app = express();

app.use(cors());
app.use(bodyParser.json());

// ✅ POST: Save to both /users and /schools
app.post("/school", async (req, res) => {
  let { name, address, phone, password } = req.body;

  if (!name || !address || !phone || !password) {
    return res.status(400).send({ error: "Missing required fields." });
  }

  try {
    // Safe key from name
    const userid = name.trim().toLowerCase().replace(/\s+/g, "_");

    const schoolData = {
      userid,
      name,
      address,
      phone,
      password
    };

    // ✅ 1. Save in /users with auto-generated key
    const userRef = db.ref("users").push();
    await userRef.set(schoolData);

    // ✅ 2. Save in /schools with userid as key
    await db.ref("schools/" + userid).set(schoolData);

    res.send({
      status: "success",
      message: "School saved in both users and schools.",
      userKey: userRef.key
    });

  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ❌ Delete from schools only
app.delete("/school/:userid", async (req, res) => {
  try {
    await db.ref("schools/" + req.params.userid).remove();
    res.send({ status: "deleted", message: "Deleted Successfully from schools." });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ✅ Root Test
app.get("/", (req, res) => {
  res.send("✅ School Backend is Running...");
});

// 🚀 Start Server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
