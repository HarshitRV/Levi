import { Schema, Document, model } from "mongoose";
import { hash } from "bcrypt";

interface IUser extends Document {
	id: string;
	apiToken: Buffer;
	commandCount: number;
}

const userSchema = new Schema<IUser>({
	id: {
		type: String,
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
