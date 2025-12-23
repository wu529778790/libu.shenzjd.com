import CryptoJS from 'crypto-js';

export const CryptoService = {
  // AES-256 加密
  encrypt: (data: any, key: string): string => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
  },

  // AES-256 解密
  decrypt: <T>(ciphertext: string, key: string): T | null => {
    try {
      console.log('[Crypto] Starting decryption...');
      console.log('[Crypto] Ciphertext length:', ciphertext?.length);
      console.log('[Crypto] Key length:', key?.length);

      const bytes = CryptoJS.AES.decrypt(ciphertext, key);
      console.log('[Crypto] Bytes decrypted, size:', bytes.sigBytes);

      // 检查解密是否成功（sigBytes > 0 表示可能成功）
      if (bytes.sigBytes <= 0) {
        console.error('[Crypto] Decryption failed: sigBytes <= 0');
        return null;
      }

      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      console.log('[Crypto] Decrypted string:', decrypted);

      if (!decrypted) {
        console.error('[Crypto] Decryption failed: empty string');
        return null;
      }

      const parsed = JSON.parse(decrypted) as T;
      console.log('[Crypto] Successfully decrypted:', parsed);
      return parsed;
    } catch (error) {
      console.error('[Crypto] Decryption error:', error);
      console.error('[Crypto] Ciphertext sample:', ciphertext?.substring(0, 50));
      console.error('[Crypto] Key sample:', key?.substring(0, 10));
      return null;
    }
  },

  // SHA-256 哈希
  hash: (password: string): string => {
    return CryptoJS.SHA256(password).toString();
  },
};
