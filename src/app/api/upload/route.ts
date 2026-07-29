import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { withDB } from '@/lib/mongodb';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_FOLDERS = ['messages', 'avatars'];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  return withDB(async () => {
    const formData = await req.formData();
    const file = formData.get('file');
    const folderInput = formData.get('folder');
    const folder = typeof folderInput === 'string' && ALLOWED_FOLDERS.includes(folderInput)
      ? folderInput
      : 'messages';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image must be smaller than 5MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `broadcast-hub/${folder}` },
        (error, uploadResult) => {
          if (error || !uploadResult) reject(error || new Error('Upload failed'));
          else resolve(uploadResult as { secure_url: string });
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({ url: result.secure_url });
  });
}
