import mongoose from "mongoose";

const connectionOptions = {
  serverSelectionTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000
};
let reconnectTimer;

function scheduleReconnect(uri) {
  if (reconnectTimer || mongoose.connection.readyState === 1) return;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = undefined;
    if (mongoose.connection.readyState !== 0) return;

    try {
      await mongoose.connect(uri, connectionOptions);
    } catch (error) {
      console.error("MongoDB reconnect failed:", error.message);
      scheduleReconnect(uri);
    }
  }, 15000);
  reconnectTimer.unref();
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  mongoose.connection.on("connected", () => console.log("MongoDB connected"));
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected; waiting for reconnection");
    if (uri) scheduleReconnect(uri);
  });
  mongoose.connection.on("error", (error) => console.error("MongoDB connection error:", error.message));

  if (!uri) {
    console.warn("MONGODB_URI is missing. API will still start, but database features will not work.");
    return;
  }

  try {
    await mongoose.connect(uri, connectionOptions);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    scheduleReconnect(uri);
  }
}
