// Lazy-load cloudinary only when needed (not available on Cloudflare Workers)
let _cloudinary: any = null;

async function getCloudinary() {
  if (!_cloudinary) {
    try {
      const mod = await import('cloudinary');
      _cloudinary = mod.v2 || mod.default?.v2 || mod;
      const configured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
      if (configured && _cloudinary?.config) {
        _cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
      }
    } catch (e: any) {
      console.error('[cloudinary] not available:', e?.message);
      return null;
    }
  }
  return _cloudinary;
}

export function isCloudinaryConfigured() {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export async function uploadToCloudinary(file: Buffer, folder: string = 'ischool'): Promise<{
  url: string;
  publicId: string;
  thumbnailUrl?: string;
} | null> {
  const cloudinary = await getCloudinary();
  if (!cloudinary) return null;
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (err: any, result: any) => {
        if (err) {
          console.error('[cloudinary] upload error:', err.message);
          reject(err);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            thumbnailUrl: cloudinary.url(result.public_id, { width: 300, height: 300, crop: 'thumb', gravity: 'auto' }),
          });
        }
      }
    );
    uploadStream.end(file);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  const cloudinary = await getCloudinary();
  if (!cloudinary) return;
  await cloudinary.uploader.destroy(publicId);
}

export async function generateUploadSignature(folder: string = 'ischool'): Promise<{
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
} | null> {
  const cloudinary = await getCloudinary();
  if (!cloudinary) return null;
  
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET!
  );
  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  };
}
