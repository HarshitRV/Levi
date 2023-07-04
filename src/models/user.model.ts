import { Schema, Document, model } from "mongoose";
import { hash } from "bcrypt";

/**
 * Types
 */
import { IUser } from "../@types/types";

const userSchema = new Schema<IUser>({
	discordId: {
		type: String,
		required: true,
		unique: true,
	},
	apiToken: {
		type: Buffer,
		default: null,
	},
	commandCount: {
		type: Number,
		default: 5,
	},
});

const User = model("User", userSchema);

export default User;
