import { describe, it, expect } from 'vitest';
import { EncryptionService } from '../src/lib/encryption.js';
import * as crypto from 'node:crypto';

describe('EncryptionService', () => {
    /**
     * Helper: generates a deterministic P-256 keypair from a seed string.
     */
    function generateKeypair(seed: string) {
        const hash = crypto.createHash('sha256').update(seed).digest();
        const ecdh = crypto.createECDH('prime256v1');
        ecdh.setPrivateKey(hash);
        return {
            publicKey: ecdh.getPublicKey(),
            privateKey: ecdh.getPrivateKey(),
        };
    }

    it('should encrypt and decrypt a string round-trip', async () => {
        const { publicKey, privateKey } = generateKeypair('test-seed-alpha');
        const original = JSON.stringify({ secret: 'hello-world', num: 42 });

        const encrypted = await EncryptionService.encrypt(original, publicKey);
        const decrypted = await EncryptionService.decrypt(encrypted, privateKey);

        expect(decrypted.toString()).toBe(original);
    });

    it('should encrypt and decrypt a Buffer round-trip', async () => {
        const { publicKey, privateKey } = generateKeypair('test-seed-buffer');
        const original = Buffer.from('binary-data-test-payload');

        const encrypted = await EncryptionService.encrypt(original, publicKey);
        const decrypted = await EncryptionService.decrypt(encrypted, privateKey);

        expect(decrypted.toString()).toBe(original.toString());
    });

    it('should fail to decrypt with a different private key', async () => {
        const keysA = generateKeypair('owner-agent');
        const keysB = generateKeypair('attacker-agent');
        const original = 'sensitive-data';

        const encrypted = await EncryptionService.encrypt(original, keysA.publicKey);

        await expect(
            EncryptionService.decrypt(encrypted, keysB.privateKey)
        ).rejects.toThrow();
    });

    it('should produce encrypted payload with all required fields', async () => {
        const { publicKey } = generateKeypair('test-seed-fields');
        const encrypted = await EncryptionService.encrypt('test', publicKey);

        expect(encrypted).toHaveProperty('iv');
        expect(encrypted).toHaveProperty('tag');
        expect(encrypted).toHaveProperty('salt');
        expect(encrypted).toHaveProperty('ephemeralPublicKey');
        expect(encrypted).toHaveProperty('ciphertext');
        expect(typeof encrypted.iv).toBe('string');
        expect(typeof encrypted.tag).toBe('string');
        expect(typeof encrypted.salt).toBe('string');
        expect(typeof encrypted.ephemeralPublicKey).toBe('string');
        expect(typeof encrypted.ciphertext).toBe('string');
    });

    it('should produce different ciphertext for the same plaintext (randomized IV)', async () => {
        const { publicKey } = generateKeypair('test-seed-random');
        const plaintext = 'same-message';

        const enc1 = await EncryptionService.encrypt(plaintext, publicKey);
        const enc2 = await EncryptionService.encrypt(plaintext, publicKey);

        expect(enc1.iv).not.toBe(enc2.iv);
        expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    });

    it('should fail if ciphertext is tampered with', async () => {
        const { publicKey, privateKey } = generateKeypair('test-seed-tamper');
        const encrypted = await EncryptionService.encrypt('original', publicKey);

        // Tamper with the ciphertext
        const tampered = { ...encrypted, ciphertext: 'deadbeef' };

        await expect(
            EncryptionService.decrypt(tampered, privateKey)
        ).rejects.toThrow();
    });
});
