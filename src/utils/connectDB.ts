import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

(async () => {
	try {
		const con = await mongoose.connect(MONGODB_URI);
		if (con) console.log("mongodb connected...");
	} catch (e) {
		console.error(e);
	}
})();
