/**
 * Node modules
 */
import { setTimeout } from "timers/promises";

/**
 * Models
 */
import User from "../../../models/user.model";

const wait = setTimeout;

export const interactionReply = async (
	reply: string | null | undefined,
	interaction: any
) => {
	console.log(reply, interaction);
	try {
		if (reply === null) {
			await interaction.reply({
				content:
					"Couldn't get response at the moment please try again later, also ensure that the API token you provided is a valid one",
			});
			return;
		} else {
			await interaction.reply({ content: reply });
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
