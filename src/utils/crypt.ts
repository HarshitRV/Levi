import crypto from "crypto";

export const encrypt = (data: Buffer, key: string) => {
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
	const encrypted = Buffer.concat([iv, cipher.update(data), cipher.final()]);
	return encrypted;
};

export const decrypt = (encryptedData: Buffer, key: string) => {
	const iv = encryptedData.slice(0, 16);
	const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
	const decrypted = Buffer.concat([
		decipher.update(encryptedData.slice(16)),
		decipher.final(),
	]);
	return decrypted;
};
