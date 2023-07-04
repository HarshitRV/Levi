/**
 * Discord.js modules
 */
import { SlashCommandBuilder } from "discord.js";
import { instructionEmbed } from "./helper/instructionEmbed";
import { interactionReply } from "./helper/interactionReply";
/**
 * Open ai modules
 */
import { Configuration, OpenAIApi } from "openai";

/**
 * Model
 */
import User from "../../models/user.model";

/**
 * Utils
 */
import { decrypt } from "../../utils/crypt";

import { setTimeout } from "node:timers/promises";
const wait = setTimeout;

const SECRET_KEY = process.env.SECRET_KEY || "";

const chatGPT = async (query: string, apiKey: string) => {
	try {
		const configuration = new Configuration({
			apiKey,
		});

		const openai = new OpenAIApi(configuration);

		const chatCompletion = await openai.createChatCompletion({
			model: "gpt-3.5-turbo-0613",
			max_tokens: 256,
			messages: [
				{ role: "system", content: "You are a helpful assistant." },
				{ role: "user", content: query },
			],
		});
		const response = chatCompletion.data.choices[0].message?.content;
		return response;
	} catch (e) {
		console.log("Error fetching gpt reply");
		console.error(e);
		return null;
	}
};

const data = new SlashCommandBuilder()
	.setName("gpt")
	.setDescription("ask chat gpt")
	.addStringOption((option) =>
		option.setName("query").setDescription("enter your query").setRequired(true)
	);

const execute = async (interaction: any) => {
	try {
		const query = interaction.options.getString("query");

		const existingUser = await User.findOne({
			discordId: interaction.user.id,
		});

		if (existingUser && existingUser.commandCount !== 0) {
			console.log("new user has been created, using trial commands");
			const apiKey = process.env.OPENAI_API_KEY || "";
			// const reply = await chatGPT(query, apiKey);
			await interaction.deferReply("a message");
			await wait(4000);
			await interaction.editReply(`1. "Feeling grateful for all the amazing people in my life. :pray: Spread kindness and love today! #thankful #gratitude"
			2. "It's never too late to chase your dreams. Let go of fear and go after what you truly want. :dizzy::sparkles: #dreambig #goafterit"
			3. "Sometimes all you need is a good book and a hot cup of tea. :coffee::books: #selfcare #relaxationtime"
			4. "Positive energy attracts more positive energy. Surround yourself with people who lift you up and inspire you. :high_brightness: #positivity #goodvibesonly"
			5. "Small acts of kindness can make a big difference in someone's day. Let's make kindness a priority. :two_hearts: #bekind #spreadlove"
			6. "The best way to predict the future is to create it. Take action towards your goals and make your dreams a reality. :muscle::sparkles: #motivation #dreambig"
			7. "Life's too short to hold grudges. Forgive, let go, and focus on building a brighter future. :star2: #forgiveness #movingon"
			 8. "Remember to give yourself permission to rest. Taking a break ChatInputCommandInteraction`);
			return;
			// interactionReply(reply, interaction);

			// existingUser.commandCount -= 1;
			// await existingUser.save();
		} else if (existingUser?.apiToken) {
			console.log("user has token, using token if trial commands finished");
			const encryptedKey = existingUser.apiToken;
			const apiKey = decrypt(encryptedKey, SECRET_KEY);

			const reply = await chatGPT(query, apiKey.toString());

			interactionReply(reply, interaction);
		} else if (existingUser === null) {
			console.log("Creating new user.");
			const user = new User({
				discordId: interaction.user.id,
				commandCount: 4,
			});
			await user.save();

			const apiKey = process.env.OPENAI_API_KEY || "";

			const reply = await chatGPT(query, apiKey);

			interactionReply(reply, interaction);
		} else {
			console.log("asking user to create token since trial commands are over");
			return await interaction.reply({
				embeds: [instructionEmbed],
				ephemeral: true,
			});
		}
	} catch (e) {
		console.log("Error in chateGPT.ts");
		console.error(e);
	}
};

export = {
	data,
	execute,
};
