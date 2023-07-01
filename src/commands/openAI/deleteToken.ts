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

const confirm = new ButtonBuilder()
	.setCustomId("confirm")
	.setLabel("confirm")
	.setStyle(ButtonStyle.Danger);

const row = new ActionRowBuilder().addComponents(confirm);

const data = new SlashCommandBuilder()
	.setName("delete-token")
	.setDescription("delete your open-ai api token");

const execute = async (interaction: any) => {
	try {
		const existingUser = await User.findOne({
			id: interaction.user.id,
		});

		let response;
		if (existingUser) {
			response = await interaction.reply({
				content: "Are you sure you want to delete your token?",
				ephemeral: true,
				components: [row],
			});

			const collectorFilter = (i: any) => i.user.id === interaction.user.id;

			try {
				const confirmation = await response.awaitMessageComponent({
					filter: collectorFilter,
					time: 60_000,
				});

				if (confirmation.customId === "confirm") {
					await User.findOneAndUpdate(
						{
							id: interaction.user.id,
						},
						{
							$unset: { apiToken: 1 },
						},
						{
							new: true,
						}
					);
					return confirmation.update({
						content: "Deleted your token ✅",
						components: [],
					});
				}
			} catch (e) {
				console.error(e);
			}
		} else {
			return interaction.reply({
				content: "Your token is not registered with user 🤔",
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
