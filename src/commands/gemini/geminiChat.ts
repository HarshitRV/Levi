/**
 * Discord.js modules
 */
import { SlashCommandBuilder } from "discord.js";

import {
	GoogleGenerativeAI,
	HarmCategory,
	HarmBlockThreshold,
	EnhancedGenerateContentResponse,
} from "@google/generative-ai";

const geminiResponse = async (query: string, apiKey: string) => {
	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({ model: "gemini-pro" });

	const generationConfig = {
		temperature: 0.9,
		topK: 1,
		topP: 1,
		maxOutputTokens: 2048,
	};

	const safetySettings = [
		{
			category: HarmCategory.HARM_CATEGORY_HARASSMENT,
			threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
		},
		{
			category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
			threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
		},
		{
			category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
			threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
		},
		{
			category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
			threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
		},
	];

	const parts = [{ text: query }];

	const result = await model.generateContent({
		contents: [{ role: "user", parts }],
		generationConfig,
		safetySettings,
	});

	const response = result.response;

	return response.text();
};

const data = new SlashCommandBuilder()
	.setName("gemini")
	.setDescription("Ask google's gemini anything")
	.addStringOption((option) =>
		option.setName("query").setDescription("enter your query").setRequired(true)
	);

const execute = async (interaction: any) => {
	try {
		const query = interaction.options.getString("query");

		await interaction.deferReply();

		const apiKey = process.env.GEMINI_API_KEY || "";
		const reply = await geminiResponse(query, apiKey);

		await interaction.editReply(reply);
	} catch (e) {
		console.log("Error in geminiChat.ts");
		console.log("Interaction initiated by user: ", interaction.user.id);
		console.error(e);

		await interaction.editReply({ content: "Error processing request" });
	}
};

export = { data, execute };
