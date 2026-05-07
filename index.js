require("dotenv").config();

const mqtt = require("mqtt");
const admin = require("firebase-admin");
const fs = require("fs");

// ================= FIREBASE =================
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ================= MQTT =================
const client = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
  protocol: "mqtts",
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
});

client.on("connect", () => {
  console.log("✅ MQTT Connected");

  client.subscribe(process.env.MQTT_TOPIC, (err) => {
    if (!err) {
      console.log("✅ Subscribe Success");
    }
  });
});

// ================= RECEIVE MQTT =================
client.on("message", async (topic, message) => {

  try {

    const data = JSON.parse(message.toString());
    console.log("📥 Data Received:", data);

    // Tambahkan timestamp
    data.timestamp = new Date();

    // Save to Firestore
    await db.collection("sensor_data").add(data);
    console.log("🔥 Saved to Firestore", data);

  } catch (err) {
    console.error("❌ Error:", err);
  }
});