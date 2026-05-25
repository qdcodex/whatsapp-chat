import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: mongoose.Connection | undefined;
}

export async function connectDB() {
  // Check inside the function so the module can be imported at build time
  // without MONGODB_URI being present (Next.js imports API routes during build).
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }

  if (global._mongooseConn && global._mongooseConn.readyState === 1) {
    return global._mongooseConn;
  }

  // dbName is intentionally NOT set here — the database name comes from
  // the MONGODB_URI itself (works for both local URIs and Railway's MONGO_URL).
  // If you want to force a specific DB name, append it to the URI: .../whatsapp
  const conn = await mongoose.connect(uri);
  global._mongooseConn = conn.connection;
  return global._mongooseConn;
}
