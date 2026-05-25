import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in .env.local');
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: mongoose.Connection | undefined;
}

export async function connectDB() {
  if (global._mongooseConn && global._mongooseConn.readyState === 1) {
    return global._mongooseConn;
  }
  // dbName is intentionally NOT set here — the database name comes from
  // the MONGODB_URI itself (works for both local URIs and Railway's MONGO_URL).
  // If you want to force a specific DB name, append it to the URI: .../whatsapp
  const conn = await mongoose.connect(MONGODB_URI);
  global._mongooseConn = conn.connection;
  return global._mongooseConn;
}
