/**
 * Types
 */
import { IUser } from "../../../@types/types";

export const interactionReply = async (
	reply: string | null | undefined,
	interaction: any,
	user: IUser
) => {
	try {
		// Decrement trial commands count
		if (user.apiToken === null) user.commandCount -= 1;

		if (reply === "MAX_TOKEN_LIMIT") {
			await interaction.editReply({
				content: "MAX_TOKEN_LIMIT allowed is 256.",
			});
			return;
		} else if (reply === null || reply?.length === 0) {
			await interaction.editReply({
				content:
					"Couldn't get a response at the moment. Please try again later, and also ensure that if you provided the API token then it should be a valid one.",
			});
			return;
		} else {
			await interaction.editReply(reply);
		}
	} catch (e) {
		console.log("Error in interactionReply.ts");
		console.log("Interaction initiated by user: ", interaction.user.id);
		console.error(e);

		// Increment trial command count incase of error
		if (user.apiToken === null) user.commandCount += 1;

		await interaction.editReply({ content: "Error processing request" });
	} finally {
		await user.save();
	}
};
