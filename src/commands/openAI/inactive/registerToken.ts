import { encrypt } from "../../../utils/crypt.js";

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
 * Helpers
 */
import { getEmbed } from "../helper/getEmbed.js";

/**
 * User model
 */
import User from "../../../models/user.model.js";

const SECRET_KEY: string = process.env.SECRET_KEY || "";

const update: ButtonBuilder = new ButtonBuilder()
	.setCustomId("update")
	.setLabel("Update")
	.setStyle(ButtonStyle.Success);

const row: ActionRowBuilder = new ActionRowBuilder().addComponents(update);

const data = new SlashCommandBuilder()
	.setName("register-token")
	.setDescription("registers your open-ai api token")
	.addStringOption((option) =>
		option
			.setName("token")
			.setDescription("enter your api token")
			.setRequired(true)
	);

const execute = async (interaction: any) => {
	try {
		const apiToken = await interaction.options.getString("token");

		const encryptedToken = encrypt(apiToken, SECRET_KEY);

		const existingUser = await User.findOne({
			discordId: interaction.user.id,
		});

		let response;
		if (existingUser?.apiToken) {
			const updateEmbed = getEmbed(
				"Update Token",
				"Your token is already registered. Do you wish to update?",
			);
			response = await interaction.reply({
				embeds: [updateEmbed],
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
					existingUser.apiToken = encryptedToken;
					await existingUser.save();

					const updatedEmbed = getEmbed("Updated", "✅ Updated your api token");

					return confirmation.update({
						embeds: [updatedEmbed],
						components: [],
					});
				}
			} catch (e) {
				console.error(e);
			}
		} else if (existingUser) {
			existingUser.apiToken = encryptedToken;
			await existingUser.save();

			const updatedEmbed = getEmbed(
				"Updated",
				"✅ Updated token successfully\n"
			);

			return interaction.reply({
				embeds: [updatedEmbed],
				ephemeral: true,
			});
		} else {
			const user = new User({
				discordId: interaction.user.id,
				apiToken: encryptedToken,
			});
	
			await user.save();

			const savedEmbed = getEmbed("Saved", "✅ Saved token successfully\n");
			return interaction.reply({
				embeds: [savedEmbed],
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
