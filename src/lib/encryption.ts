import * as crypto from 'node:crypto';

/**
 * EncryptionService - Handles ECIES encryption for agent data.
 * Uses X25519 for Key Exchange and AES-256-GCM for symmetric encryption.
 */
export class EncryptionService {
    private static X25519_SPKI_HEADER = Buffer.from('302a300506032b656e032100', 'hex');
    private static X25519_PKCS8_HEADER = Buffer.from('302e020100300506032b656e04220420', 'hex');

    /**
     * Encrypts data for a specific public key (X25519).
     * @param data The data to encrypt (Buffer or string).
     * @param recipientPublicKey The recipient's X25519 public key (raw 32 bytes).
     * @returns The encrypted payload (JSON with iv, ciphertext, ephemeralPublicKey, tag).
     */
    static async encrypt(data: Buffer | string, recipientPublicKey: Buffer) {
        // 1. Generate ephemeral X25519 key pair
        const { publicKey: ephemeralPub, privateKey: ephemeralPriv } = crypto.generateKeyPairSync('x25519');
        
        // 2. Wrap recipient's raw public key in SPKI
        const remotePubKey = crypto.createPublicKey({
            key: Buffer.concat([this.X25519_SPKI_HEADER, recipientPublicKey]),
            format: 'der',
            type: 'spki'
        });

        // 3. Perform Diffie-Hellman to get shared secret
        const sharedSecret = crypto.diffieHellman({
            privateKey: ephemeralPriv,
            publicKey: remotePubKey
        });

        // 4. Derive symmetric key (AES-256) using HKDF
        const salt = crypto.randomBytes(16);
        const encryptionKey = crypto.hkdfSync('sha256', sharedSecret, salt, Buffer.from('agent-db-x25519-v1'), 32);

        // 5. Encrypt with AES-256-GCM
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey), iv);
        
        const payload = typeof data === 'string' ? Buffer.from(data) : data;
        let ciphertext = cipher.update(payload);
        ciphertext = Buffer.concat([ciphertext, cipher.final()]);
        const tag = cipher.getAuthTag();

        const ephemRaw = ephemeralPub.export({ format: 'der', type: 'spki' }).slice(this.X25519_SPKI_HEADER.length);

        return {
            iv: iv.toString('hex'),
            tag: tag.toString('hex'),
            salt: salt.toString('hex'),
            ephemeralPublicKey: ephemRaw.toString('hex'),
            ciphertext: ciphertext.toString('hex')
        };
    }

    /**
     * Decrypts an ECIES payload using a raw private key.
     * @param payload The encrypted payload.
     * @param privateKey The recipient's raw private key Buffer (32 bytes).
     * @returns The decrypted data as a Buffer.
     */
    static async decrypt(payload: any, privateKey: Buffer) {
        const { iv, tag, salt, ephemeralPublicKey, ciphertext } = payload;

        // 1. Wrap raw keys in KeyObjects
        const localPrivKey = crypto.createPrivateKey({
            key: Buffer.concat([this.X25519_PKCS8_HEADER, privateKey]),
            format: 'der',
            type: 'pkcs8'
        });

        const remotePubKey = crypto.createPublicKey({
            key: Buffer.concat([this.X25519_SPKI_HEADER, Buffer.from(ephemeralPublicKey, 'hex')]),
            format: 'der',
            type: 'spki'
        });

        // 2. Perform Diffie-Hellman for shared secret
        const sharedSecret = crypto.diffieHellman({
            privateKey: localPrivKey,
            publicKey: remotePubKey
        });

        // 3. Derive symmetric key using HKDF
        const encryptionKey = crypto.hkdfSync(
            'sha256', 
            sharedSecret, 
            Buffer.from(salt, 'hex'), 
            Buffer.from('agent-db-x25519-v1'), 
            32
        );

        // 4. Decrypt with AES-256-GCM
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm', 
            Buffer.from(encryptionKey), 
            Buffer.from(iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(tag, 'hex'));

        let decrypted = decipher.update(Buffer.from(ciphertext, 'hex'));
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted;
    }
}
