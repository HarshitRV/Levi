import { Schema, Document, model } from "mongoose";
import { hash } from "bcrypt";

interface IUser extends Document {
	id: string;
	apiToken: string;
}

const userSchema = new Schema<IUser>({
	id: {
		type: String,
	},
	apiToken: {
		type: String,
	},
});

/**
 * Hash and save the token
 */
userSchema.pre("save", async function (next) {
	try {
		if (this.isModified("apiToken")) {
			const hashedToken = await hash(this.apiToken, 8);
			this.apiToken = hashedToken;
		}
		next();
	} catch (e: any) {
		console.error(e);
		next(e);
	}
});

const User = model("User", userSchema);

export default User;
