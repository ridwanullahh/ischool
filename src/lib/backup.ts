import { createGzip } from 'zlib';
import { createReadStream, createWriteStream, statSync, unlinkSync, readdirSync, renameSync } from 'fs';
import { join, resolve } from 'path';
import { pipeline } from 'stream/promises';

const DB_PATH = resolve(process.cwd(), 'ischool.db');
const BACKUP_DIR = resolve(process.cwd(), '.backups');
const RETENTION_COUNT = parseInt(import.meta.env.BACKUP_RETENTION_COUNT || '3');

export interface BackupResult {
  success: boolean;
  localPath?: string;
  remoteUrl?: string;
  sizeBytes: number;
  compressedSize: number;
  provider: string;
  timestamp: string;
  error?: string;
}

async function compressDatabase(): Promise<{ path: string; size: number; originalSize: number }> {
  const { mkdirSync, existsSync } = await import('fs');
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const compressedPath = join(BACKUP_DIR, `ischool-backup-${timestamp}.db.gz`);
  const originalSize = statSync(DB_PATH).size;

  await pipeline(
    createReadStream(DB_PATH),
    createGzip({ level: 9 }),
    createWriteStream(compressedPath)
  );

  const compressedSize = statSync(compressedPath).size;
  return { path: compressedPath, size: compressedSize, originalSize };
}

function cleanupOldBackups() {
  const { existsSync } = require('fs');
  if (!existsSync(BACKUP_DIR)) return;
  const files = readdirSync(BACKUP_DIR)
    .filter((f: string) => f.startsWith('ischool-backup-') && f.endsWith('.db.gz'))
    .sort()
    .reverse();
  for (const file of files.slice(RETENTION_COUNT)) {
    unlinkSync(join(BACKUP_DIR, file));
  }
}

async function uploadToGoogleDrive(filePath: string, fileName: string): Promise<string> {
  const clientId = import.meta.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = import.meta.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = import.meta.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const folderId = import.meta.env.GOOGLE_DRIVE_FOLDER_ID || 'root';

  if (!clientId || !clientSecret || !refreshToken) throw new Error('Google Drive credentials not configured');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const { access_token } = await tokenRes.json();

  const { readFileSync } = await import('fs');
  const fileContent = readFileSync(filePath);
  const metadata = { name: fileName, parents: [folderId] };

  const boundary = '---backup_boundary_' + Date.now();
  const body = [
    `--${boundary}\r\n`,
    `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata), '\r\n',
    `--${boundary}\r\n`,
    `Content-Type: application/gzip\r\n\r\n`,
  ].join('');

  const bodyEnd = `\r\n--${boundary}--`;
  const bodyBuffer = Buffer.from(body);
  const endBuffer = Buffer.from(bodyEnd);
  const fullBody = Buffer.concat([bodyBuffer, fileContent, endBuffer]);

  const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(fullBody.length),
    },
    body: fullBody,
  });
  const result = await uploadRes.json();
  if (result.error) throw new Error(result.error.message);
  return `https://drive.google.com/file/d/${result.id}`;
}

async function uploadToDropbox(filePath: string, fileName: string): Promise<string> {
  const token = import.meta.env.DROPBOX_ACCESS_TOKEN;
  if (!token) throw new Error('Dropbox access token not configured');

  const { readFileSync } = await import('fs');
  const fileContent = readFileSync(filePath);

  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({ path: `/ischool-backups/${fileName}`, mode: 'add', autorename: true }),
    },
    body: fileContent,
  });
  const result = await res.json();
  if (result.error) throw new Error(JSON.stringify(result.error));
  return `https://dropbox.com/home/ischool-backups/${fileName}`;
}

async function uploadToBackblazeB2(filePath: string, fileName: string): Promise<string> {
  const keyId = import.meta.env.BACKBLAZE_KEY_ID;
  const appKey = import.meta.env.BACKBLAZE_APP_KEY;
  const bucketId = import.meta.env.BACKBLAZE_BUCKET_ID;

  if (!keyId || !appKey || !bucketId) throw new Error('Backblaze B2 credentials not configured');

  const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { 'Authorization': 'Basic ' + Buffer.from(`${keyId}:${appKey}`).toString('base64') },
  });
  const auth = await authRes.json();

  const uploadUrlRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: { 'Authorization': auth.authorizationToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId }),
  });
  const uploadUrl = await uploadUrlRes.json();

  const { readFileSync } = await import('fs');
  const fileContent = readFileSync(filePath);
  const crypto = await import('crypto');
  const sha1 = crypto.createHash('sha1').update(fileContent).digest('hex');

  await fetch(uploadUrl.uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': uploadUrl.authorizationToken,
      'Content-Type': 'application/gzip',
      'X-Bz-File-Name': `ischool-backups/${fileName}`,
      'X-Bz-Content-Sha1': sha1,
    },
    body: fileContent,
  });

  return `b2://ischool-backups/${fileName}`;
}

async function uploadToS3(filePath: string, fileName: string): Promise<string> {
  const accessKey = import.meta.env.S3_ACCESS_KEY;
  const secretKey = import.meta.env.S3_SECRET_KEY;
  const bucket = import.meta.env.S3_BUCKET;
  const region = import.meta.env.S3_REGION || 'us-east-1';
  const endpoint = import.meta.env.S3_ENDPOINT;

  if (!accessKey || !secretKey || !bucket) throw new Error('S3 credentials not configured');

  const { readFileSync } = await import('fs');
  const crypto = await import('crypto');
  const fileContent = readFileSync(filePath);
  const key = `ischool-backups/${fileName}`;

  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

  const host = endpoint ? new URL(endpoint).host : `${bucket}.s3.${region}.amazonaws.com`;
  const baseUrl = endpoint || `https://${host}`;

  const res = await fetch(`${baseUrl}/${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/gzip',
      'x-amz-date': amzDate,
      'Content-Length': String(fileContent.length),
    },
    body: fileContent,
  });

  if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
  return `${baseUrl}/${key}`;
}

async function uploadToMega(filePath: string, _fileName: string): Promise<string> {
  const email = import.meta.env.MEGA_EMAIL;
  const password = import.meta.env.MEGA_PASSWORD;
  if (!email || !password) throw new Error('MEGA credentials not configured');

  const { readFileSync } = await import('fs');
  const fileContent = readFileSync(filePath);

  throw new Error('MEGA upload requires the megajs npm package. Install it with: npm install megajs');
}

export async function runBackup(): Promise<BackupResult> {
  const provider = import.meta.env.BACKUP_PROVIDER || 'local';
  const timestamp = new Date().toISOString();

  try {
    const { path: compressedPath, size, originalSize } = await compressDatabase();
    const fileName = compressedPath.split('/').pop()!;
    let remoteUrl = compressedPath;

    switch (provider) {
      case 'google_drive':
        remoteUrl = await uploadToGoogleDrive(compressedPath, fileName);
        break;
      case 'dropbox':
        remoteUrl = await uploadToDropbox(compressedPath, fileName);
        break;
      case 'backblaze_b2':
        remoteUrl = await uploadToBackblazeB2(compressedPath, fileName);
        break;
      case 's3':
        remoteUrl = await uploadToS3(compressedPath, fileName);
        break;
      case 'mega':
        remoteUrl = await uploadToMega(compressedPath, fileName);
        break;
      case 'local':
      default:
        break;
    }

    if (provider !== 'local') {
      try { unlinkSync(compressedPath); } catch {}
    }

    cleanupOldBackups();

    return {
      success: true,
      localPath: provider === 'local' ? compressedPath : undefined,
      remoteUrl,
      sizeBytes: originalSize,
      compressedSize: size,
      provider,
      timestamp,
    };
  } catch (error: any) {
    return {
      success: false,
      sizeBytes: 0,
      compressedSize: 0,
      provider,
      timestamp,
      error: error.message || 'Unknown error',
    };
  }
}

export async function restoreBackup(backupPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { existsSync, copyFileSync } = await import('fs');
    const { createGunzip } = await import('zlib');

    if (!existsSync(backupPath)) return { success: false, error: 'Backup file not found' };

    if (backupPath.endsWith('.gz')) {
      const tempPath = DB_PATH + '.restoring';
      await pipeline(
        createReadStream(backupPath),
        createGunzip(),
        createWriteStream(tempPath)
      );
      renameSync(tempPath, DB_PATH);
    } else {
      copyFileSync(backupPath, DB_PATH);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function listBackups(): Array<{ name: string; path: string; size: number; date: string }> {
  const { existsSync } = require('fs');
  if (!existsSync(BACKUP_DIR)) return [];
  return readdirSync(BACKUP_DIR)
    .filter((f: string) => f.startsWith('ischool-backup-') && f.endsWith('.db.gz'))
    .sort()
    .reverse()
    .map((f: string) => {
      const stat = statSync(join(BACKUP_DIR, f));
      return { name: f, path: join(BACKUP_DIR, f), size: stat.size, date: stat.mtime.toISOString() };
    });
}
