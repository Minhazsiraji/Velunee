import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

@Injectable()
export class CryptoService {
  private readonly key: Buffer | null;

  constructor(config: ConfigService) {
    const encoded = config.get<string>(
      'FIELD_ENCRYPTION_KEY',
    );

    if (!encoded) {
      this.key = null;
      return;
    }

    const key = Buffer.from(encoded, 'base64');

    if (key.byteLength !== 32) {
      throw new Error(
        'FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes',
      );
    }

    this.key = key;
  }

  get enabled(): boolean {
    return this.key !== null;
  }

  encrypt(plainText: string): string {
    if (!this.key) {
      throw new Error(
        'Field encryption is not configured',
      );
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv(
      'aes-256-gcm',
      this.key,
      iv,
    );

    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return [
      'v1',
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(encryptedText: string): string {
    if (!this.key) {
      throw new Error(
        'Field encryption is not configured',
      );
    }

    const [version, encodedIv, encodedTag, encodedContent] =
      encryptedText.split('.');

    if (
      version !== 'v1' ||
      !encodedIv ||
      !encodedTag ||
      !encodedContent
    ) {
      throw new Error(
        'Unsupported or malformed encrypted field',
      );
    }

    try {
      const iv = Buffer.from(
        encodedIv,
        'base64url',
      );
      const tag = Buffer.from(
        encodedTag,
        'base64url',
      );
      const content = Buffer.from(
        encodedContent,
        'base64url',
      );

      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key,
        iv,
      );

      decipher.setAuthTag(tag);

      return Buffer.concat([
        decipher.update(content),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new Error(
        'Unable to decrypt encrypted field',
      );
    }
  }
}
