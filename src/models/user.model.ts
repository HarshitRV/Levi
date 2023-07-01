import { Schema, Document, model } from "mongoose";
import { hash } from "bcrypt";

interface IUser extends Document {
	id: string;
	apiToken: Buffer;
}

const userSchema = new Schema<IUser>({
	id: {
		type: String,
	},
	apiToken: {
		type: Buffer,
	},
});

const User = model("User", userSchema);

export default User;
