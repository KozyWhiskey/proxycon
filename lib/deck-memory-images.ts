import 'server-only';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { memoryAdmin } from './deck-memory-admin';
import type { Region } from './deck-memory';

export async function normalizeMemoryPhoto(photo: { id: string; memory_id: string; raw_key: string; normalized_key: string | null; recognition_key: string | null; status: string }) {
  const admin = memoryAdmin();
  const storage = admin.storage.from('deck-photos');
  if (photo.status === 'ready' && photo.recognition_key) return photo;
  const { data: original, error } = await storage.download(photo.raw_key);
  if (error || !original) throw new Error('Photo upload did not finish. Choose the photo again.');
  if (original.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB.');
  let bytes: Buffer = Buffer.from(await original.arrayBuffer());
  // Bundled sharp builds commonly lack HEVC. Use a maintained WASM/libheif decoder.
  const isHeif = bytes.length > 12 && bytes.toString('ascii', 4, 8) === 'ftyp'
    && /heic|heix|hevc|hevx|mif1|msf1/.test(bytes.toString('ascii', 8, 40));
  if (isHeif) {
    try {
      const metadata = await sharp(bytes, { limitInputPixels: 80_000_000 }).metadata();
      if (!metadata.width || !metadata.height || metadata.width * metadata.height > 80_000_000) throw new Error('Image dimensions too large');
      const convert = (await import('heic-convert')).default;
      const converted = await convert({ buffer: bytes, format: 'JPEG', quality: 0.95 });
      bytes = Buffer.from(converted);
    } catch { throw new Error('Could not convert this HEIC photo. Choose a JPEG or a screenshot instead.'); }
  }
  let normalized: Buffer;
  let width: number | undefined, height: number | undefined;
  try {
    const image = sharp(bytes, { limitInputPixels: 80_000_000, failOn: 'error' });
    const metadata = await image.metadata();
    if (!['jpeg','png','webp','heif'].includes(metadata.format || '')) throw new Error('Unsupported image');
    const output = await image.rotate().jpeg({ quality: 94 }).toBuffer({ resolveWithObject: true });
    normalized = output.data; width = output.info.width; height = output.info.height;
  } catch { throw new Error('This file could not be read as a photo. Choose a JPEG, PNG, WebP, or HEIC image.'); }
  const recognition = await sharp(normalized).resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 94 }).toBuffer();
  const prefix = `${photo.memory_id}/${photo.id}`;
  for (const [key, data] of [[`${prefix}/photo.jpg`, normalized], [`${prefix}/read.jpg`, recognition]] as const) {
    const uploaded = await storage.upload(key, data, { contentType: 'image/jpeg', upsert: true });
    if (uploaded.error) throw new Error('Could not prepare the photo. Try again.');
  }
  const update = { normalized_key: `${prefix}/photo.jpg`, recognition_key: `${prefix}/read.jpg`, status: 'ready', width, height,
    checksum: createHash('sha256').update(normalized).digest('hex') };
  const { data: saved, error: saveError } = await admin.from('deck_memory_photos').update(update).eq('id', photo.id).select('id').maybeSingle();
  if (saveError || !saved) {
    await admin.from('deck_memory_cleanup').upsert([{ object_key: update.normalized_key }, { object_key: update.recognition_key }]);
    throw new Error('Could not save the prepared photo. Try again.');
  }
  // Queue original removal so metadata is not retained after successful conversion.
  await admin.from('deck_memory_cleanup').upsert({ object_key: photo.raw_key });
  return { ...photo, ...update };
}

export async function recognitionImage(key: string, region?: Region | null) {
  const { data, error } = await memoryAdmin().storage.from('deck-photos').download(key);
  if (error || !data) throw new Error('Photo is unavailable. Please upload it again.');
  const bytes = Buffer.from(await data.arrayBuffer());
  if (!region) return new Uint8Array(bytes);
  const image = sharp(bytes);
  const meta = await image.metadata();
  const w = meta.width!, h = meta.height!;
  const left = Math.min(w - 1, Math.max(0, Math.floor(region.x * w)));
  const top = Math.min(h - 1, Math.max(0, Math.floor(region.y * h)));
  const crop = await image.extract({ left, top, width: Math.max(1, Math.min(w - left, Math.ceil(region.width * w))),
    height: Math.max(1, Math.min(h - top, Math.ceil(region.height * h))) }).resize({ width: 1800, height: 1800, fit: 'inside' }).jpeg({ quality: 95 }).toBuffer();
  return new Uint8Array(crop);
}
