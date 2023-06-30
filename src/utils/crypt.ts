import crypto from "crypto";

const encrypt = (data: string, key: string): Buffer => {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

	cipher.setAAD(Buffer.from("additional authenticated data"));

	const encryptedData = Buffer.concat([
		iv,
		cipher.update(data, "utf8"),
		cipher.final(),
		cipher.getAuthTag(),
	]);

	return encryptedData;
};

const decrypt = (data: Buffer, key: string): string => {
	const iv = data.slice(0, 12);
	const authTag = data.slice(data.length - 16);
	const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);

	decipher.setAuthTag(authTag);

	const decryptedData = Buffer.concat([
		decipher.update(data.slice(12, data.length - 16)),
		decipher.final(),
	]);

	return decryptedData.toString("utf8");
};

const encrypted = encrypt(
	"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",
	"e;aTdl!dSy0Qwy4oZ&QX$FZ~cX_%y@lW"
);

console.log(encrypted.toString("base64"));
console.log(decrypt(encrypted, "e;aTdl!dSy0Qwy4oZ&QX$FZ~cX_%y@lW"));