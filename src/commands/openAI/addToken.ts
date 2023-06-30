import mongoose from "mongoose";

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
			apiToken,
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
					existingUser.apiToken = apiToken;
					await existingUser.save();
					return interaction.update({
						content: "Updated your api token ✅",
						component: [],
					});
				}
			} catch (e) {}
		} else {
			const user = new User({
				id: interaction.user.id,
				apiToken,
			});
		}
	} catch (e) {
		console.error(e);
	}
};
