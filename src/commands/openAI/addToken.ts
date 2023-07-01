import mongoose from "mongoose";
import { encrypt } from "../../utils/crypt.js";

/**
 * Discord js modules
 */
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	SlashCommandBuilder,
} from "discord.js";

/**
 * User model
 */
import User from "../../models/user.model.js";

const SECRET_KEY: string = process.env.SECRET_KEY || "";

const update = new ButtonBuilder()
	.setCustomId("update")
	.setLabel("Update")
	.setStyle(ButtonStyle.Success);

const row = new ActionRowBuilder().addComponents(update);

const data = new SlashCommandBuilder()
	.setName("register-token")
	.setDescription("register your open-ai api token")
	.addStringOption((option) =>
		option
			.setName("token")
			.setDescription("enter your api token")
			.setRequired(true)
	);

const execute = async (interaction: any) => {
	try {
		const apiToken = await interaction.options.getString("token");
		const existingUser = await User.findOne({
			id: interaction.user.id,
		});

		let response;
		if (existingUser) {
			response = await interaction.reply({
				content: "Your token is already registerd. Do you wish to update?",
				ephemeral: true,
				components: [row],
			});

			const collectorFilter = (i: any) => i.user.id === interaction.user.id;

			try {
				const confirmation = await response.awaitMessageComponent({
					filter: collectorFilter,
					time: 60_000,
				});

				if (confirmation.customId === "update") {
					const encryptedToken = encrypt(apiToken, SECRET_KEY);
					existingUser.apiToken = encryptedToken;
					await existingUser.save();
					return confirmation.update({
						content: "Updated your api token ✅",
						components: [],
					});
				}
			} catch (e) {}
		} else {
			const encryptedToken = encrypt(apiToken, SECRET_KEY);
			const user = new User({
				id: interaction.user.id,
				apiToken: encryptedToken,
			});
			await user.save();
			return interaction.reply({
				content:
					"✅ Saved your token, now you are ready to use `/gpt` and `/instruct-gpt`",
				ephemeral: true,
			});
		}
	} catch (e) {
		console.error(e);
	}
};

export = {
	data,
	execute,
};
