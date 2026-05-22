require("dotenv").config();

const mqtt = require("mqtt");
const admin = require("firebase-admin");

const requiredEnv = [
  "MQTT_HOST",
  "MQTT_PORT",
  "MQTT_USER",
  "MQTT_PASS",
  "MQTT_TOPIC"
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(", ")}`);
}

const mqttPort = Number(process.env.MQTT_PORT);
const saveIntervalMs = Number(process.env.SAVE_INTERVAL_MS || 60 * 1000);
const firestoreCollection = process.env.FIRESTORE_COLLECTION || "sensor_data";

if (!Number.isInteger(mqttPort)) {
  throw new Error("MQTT_PORT must be a valid number");
}

if (!Number.isInteger(saveIntervalMs) || saveIntervalMs < 1000) {
  throw new Error("SAVE_INTERVAL_MS must be a number greater than or equal to 1000");
}

let lastSavedTime = 0;

// ================= FIREBASE =================
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ================= MQTT =================
const client = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: mqttPort,
  protocol: "mqtts",
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS
});

client.on("connect", () => {
  console.log("MQTT connected");

  client.subscribe(process.env.MQTT_TOPIC, (err) => {
    if (err) {
      console.error("MQTT subscribe failed:", err);
      return;
    }

    console.log(`Subscribed to topic: ${process.env.MQTT_TOPIC}`);
  });
});

// ================= RECEIVE MQTT =================
client.on("message", async (topic, message) => {
  try {
    const now = Date.now();

    // ================= RATE LIMIT 1 MENIT =================
    if (now - lastSavedTime < saveIntervalMs) {
      console.log("Data ignored because it is still inside the save interval");
      return;
    }

    const data = JSON.parse(message.toString());
    console.log("Data received:", data);

    // Tambahkan timestamp
    data.timestamp = new Date();

    // Save to Firestore
    await db.collection(firestoreCollection).add(data);
    lastSavedTime = now; // update waktu terakhir simpan

    console.log(`Saved to Firestore collection: ${firestoreCollection}`);
  } catch (err) {
    console.error("Error:", err);
  }
});
