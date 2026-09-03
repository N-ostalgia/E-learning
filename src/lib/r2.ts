// src/lib/r2.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

type R2Config = {
  bucketName: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
};

let r2Client: S3Client | undefined;

function getR2Client(): { client: S3Client; config: R2Config } {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    throw new Error("R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.");
  }

  r2Client ??= new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return { client: r2Client, config: { bucketName, endpoint, accessKeyId, secretAccessKey } };
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  contentLength: number,
  expiresIn = 3600
) {
  const { client, config } = getR2Client();
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
) {
  const { client, config } = getR2Client();
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function deleteFile(key: string) {
  const { client, config } = getR2Client();
  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  return client.send(command);
}

export async function fileExists(key: string) {
  const { client, config } = getR2Client();
  try {
    await client.send(new HeadObjectCommand({ Bucket: config.bucketName, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export function generateKey(
  userId: string,
  folder: string,
  originalName: string
) {
  const ext = originalName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "file";
  const timestamp = Date.now();
  return `${userId}/${folder}/${timestamp}-${randomUUID()}.${ext}`;
}

export function getPublicUrl(key: string) {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) return null;
  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

export function getR2ClientDirect() {
  return getR2Client().client;
}