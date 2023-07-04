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
import { encode, decode } from "gpt-3-encoder";

/**
 * Model
 */
import User from "../../models/user.model";

/**
 * Utils
 */
import { decrypt } from "../../utils/crypt";

const SECRET_KEY = process.env.SECRET_KEY || "";

const chatGPT = async (query: string, apiKey: string) => {
	try {
		const configuration = new Configuration({
			apiKey,
		});

		const openai = new OpenAIApi(configuration);

		const encodedLength = encode(query).length;

		if (encodedLength >= 256) return "MAX_TOKEN_LIMIT";

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
			const apiKey = process.env.OPENAI_API_KEY || "";

			await interaction.deferReply();

			const reply = await chatGPT(query, apiKey);

			interactionReply(reply, interaction, existingUser);
		} else if (existingUser?.apiToken) {
			const encryptedKey = existingUser.apiToken;
			const apiKey = decrypt(encryptedKey, SECRET_KEY);

			await interaction.deferReply();

			const reply = await chatGPT(query, apiKey.toString());

			interactionReply(reply, interaction, existingUser);
		} else if (existingUser === null) {
			const user = new User({
				discordId: interaction.user.id,
				commandCount: 5,
			});
			await user.save();

			const apiKey = process.env.OPENAI_API_KEY || "";

			await interaction.deferReply();

			const reply = await chatGPT(query, apiKey);

			interactionReply(reply, interaction, user);
		} else {
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
