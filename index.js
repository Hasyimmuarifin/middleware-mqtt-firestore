const mqtt = require("mqtt");
const admin = require("firebase-admin");
let lastSavedTime = 0;
const MIN_INTERVAL = 60 * 1000; // 1 menit

// ================= FIREBASE =================
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ================= MQTT =================
const options = {
  host: "a8805b4f45744c3f9ac83882e423e0c0.s1.eu.hivemq.cloud",
  port: 8883,
  protocol: "mqtts",
  username: "hasyim",
  password: "hasyimHiveMQTT#22"
};

const client = mqtt.connect(options);

client.on("connect", () => {
  console.log("✅ MQTT Connected");

  client.subscribe("nutrixense/sensor", (err) => {
    if (!err) {
      console.log("✅ Subscribe Success");
    }
  });
});

// ================= RECEIVE MQTT =================
client.on("message", async (topic, message) => {
  try {
    const now = Date.now();

    // ================= RATE LIMIT 1 MENIT =================
    if (now - lastSavedTime < MIN_INTERVAL) {
      console.log("⏳ Data ignored (rate limit 1 menit)");
      return;
    }

    const data = JSON.parse(message.toString());

    console.log("📥 Data Received:", data);

    // Tambahkan timestamp
    data.timestamp = new Date();

    // Save to Firestore
    await db.collection("sensor_data").add(data);

    lastSavedTime = now; // update waktu terakhir simpan

    console.log("🔥 Saved to Firestore");

  } catch (err) {
    console.error("❌ Error:", err);
  }
});