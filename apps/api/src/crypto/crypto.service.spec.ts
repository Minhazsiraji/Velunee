import type { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { CryptoService } from './crypto.service';

function serviceWithKey(key: Buffer): CryptoService {
  const config = { get: () => key.toString('base64') } as unknown as ConfigService;
  return new CryptoService(config);
}

describe('CryptoService', () => {
  it('round-trips encrypt then decrypt', () => {
    const service = serviceWithKey(randomBytes(32));
    const cipher = service.encrypt('hello world');
    expect(service.decrypt(cipher)).toBe('hello world');
  });

  it('decrypt throws for a field encrypted with a different key', () => {
    const written = serviceWithKey(randomBytes(32));
    const rotated = serviceWithKey(randomBytes(32));
    const cipher = written.encrypt('secret');
    expect(() => rotated.decrypt(cipher)).toThrow('Unable to decrypt encrypted field');
  });

  it('tryDecrypt returns null (never throws) after a key rotation or for malformed input', () => {
    const written = serviceWithKey(randomBytes(32));
    const rotated = serviceWithKey(randomBytes(32));
    const cipher = written.encrypt('secret');

    expect(rotated.tryDecrypt(cipher)).toBeNull();
    expect(rotated.tryDecrypt('not-a-valid-encrypted-field')).toBeNull();
  });

  it('tryDecrypt returns the plaintext for a valid field', () => {
    const service = serviceWithKey(randomBytes(32));
    expect(service.tryDecrypt(service.encrypt('ok'))).toBe('ok');
  });
});
