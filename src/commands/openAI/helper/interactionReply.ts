/**
 * Models
 */
import User from "../../../models/user.model";

export const interactionReply = async (
	reply: string | null | undefined,
	interaction: any
) => {
	try {
		if (reply?.length === 0) {
			await interaction.reply({
				content:
					"Couldn't get a response at the moment. Please try again later, and ensure that the API token you provided is valid.",
			});
			return;
		} else {
			await interaction.editReply(reply);
		}
	} catch (e) {
		console.log("Error in interactionReply.ts");
		console.log("Interaction initiated by user: ", interaction.user.id);

		const user = await User.findOne({
			discordId: interaction.user.id,
		});
		if (user) {
			user.commandCount += 1;
			await user.save();
		}

		console.error(e);
	}
};
