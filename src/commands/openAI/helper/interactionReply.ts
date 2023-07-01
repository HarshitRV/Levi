import { setTimeout } from "timers/promises";

const wait = setTimeout;

export const interactionReply = async (
	reply: string | null | undefined,
	interaction: any
) => {
	try {
		if (reply === null) {
			await interaction.reply({
				content:
					"Couldn't get response at the moment please try again later, also ensure that the API token you provided is a valid one",
			});
			return;
		} else {
			await interaction.deferReply();
			await wait(4000);
			await interaction.editReply({ content: reply });
		}
	} catch (e) {
		console.log("Error in interactionReply.ts");
		console.error(e);
	}
};
