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
			await interaction.reply({
				content: `1. "Feeling grateful for all the amazing people in my life. :pray: Spread kindness and love today! #thankful #gratitude"
			2. "It's never too late to chase your dreams. Let go of fear and go after what you truly want. :dizzy::sparkles: #dreambig #goafterit"
			3. "Sometimes all you need is a good book and a hot cup of tea. :coffee::books: #selfcare #relaxationtime"
			4. "Positive energy attracts more positive energy. Surround yourself with people who lift you up and inspire you. :high_brightness: #positivity #goodvibesonly"
			5. "Small acts of kindness can make a big difference in someone's day. Let's make kindness a priority. :two_hearts: #bekind #spreadlove"
			6. "The best way to predict the future is to create it. Take action towards your goals and make your dreams a reality. :muscle::sparkles: #motivation #dreambig"
			7. "Life's too short to hold grudges. Forgive, let go, and focus on building a brighter future. :star2: #forgiveness #movingon"
			 8. "Remember to give yourself permission to rest. Taking a break ChatInputCommandInteraction`,
			});
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
