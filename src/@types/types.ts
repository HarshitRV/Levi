import { Document } from "mongoose";

export interface IUser extends Document {
	discordId: string;
	apiToken: Buffer;
	commandCount: number;
}
