import { v2 as cloudinary } from 'cloudinary';

const configured = !!(import.meta.env.CLOUDINARY_CLOUD_NAME && import.meta.env.CLOUDINARY_API_KEY && import.meta.env.CLOUDINARY_API_SECRET);

if (configured) {
  cloudinary.config({
    cloud_name: import.meta.env.CLOUDINARY_CLOUD_NAME,
    api_key: import.meta.env.CLOUDINARY_API_KEY,
    api_secret: import.meta.env.CLOUDINARY_API_SECRET,
  });
}

export function isCloudinaryConfigured() {
  return configured;
}

export async function uploadToCloudinary(fileBuffer: Buffer, folder: string, tags: string[] = []) {
  if (!configured) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
  }

  return new Promise<{ url: string; thumbnailUrl: string; publicId: string; width: number; height: number; format: string; bytes: number }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `ischool/${folder}`,
        tags,
        resource_type: 'auto',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({
          url: result!.secure_url,
          thumbnailUrl: cloudinary.url(result!.public_id, { width: 300, height: 300, crop: 'thumb', gravity: 'auto' }),
          publicId: result!.public_id,
          width: result!.width,
          height: result!.height,
          format: result!.format,
          bytes: result!.bytes,
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
}

export async function deleteFromCloudinary(publicId: string) {
  if (!configured) return;
  await cloudinary.uploader.destroy(publicId);
}

export function getCloudinarySignature(folder: string) {
  if (!configured) return null;
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: `ischool/${folder}`, upload_preset: undefined },
    import.meta.env.CLOUDINARY_API_SECRET!
  );
  return { timestamp, signature, cloudName: import.meta.env.CLOUDINARY_CLOUD_NAME };
}
