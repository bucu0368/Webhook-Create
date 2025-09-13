const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Display all roles in the server with pagination'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const guild = interaction.guild;
            const roles = guild.roles.cache
                .filter(role => role.id !== guild.id) // Exclude @everyone role
                .sort((a, b) => b.position - a.position) // Sort by position (highest first)
                .values();
            
            const roleArray = Array.from(roles);

            if (roleArray.length === 0) {
                return await interaction.editReply({
                    content: '📭 No roles found in this server (excluding @everyone).'
                });
            }

            const itemsPerPage = 10;
            let currentPage = 0;
            const totalPages = Math.ceil(roleArray.length / itemsPerPage);

            function createEmbed(page) {
                const start = page * itemsPerPage;
                const end = start + itemsPerPage;
                const currentRoles = roleArray.slice(start, end);

                const embed = new EmbedBuilder()
                    .setTitle(`List of Roles in ${guild.name} - ${roleArray.length} roles`)
                    .setColor(getEmbedColor(interaction.client))
                    .setTimestamp();

                // Create description with role mentions and IDs
                let description = '';
                currentRoles.forEach((role, index) => {
                    const globalIndex = start + index + 1;
                    description += `\`#${globalIndex}.\` <@&${role.id}> - \`[${role.id}]\`\n`;
                });

                embed.setDescription(description);
                embed.setFooter({ 
                    text: `• Page ${page + 1}/${totalPages} | Requested by ${interaction.member?.displayName || interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

                return embed;
            }

            function createButtons(page) {
                const row = new ActionRowBuilder();
                
                const prevButton = new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0);

                const nextButton = new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1);

                row.addComponents(prevButton, nextButton);
                return row;
            }

            const embed = createEmbed(currentPage);
            const components = totalPages > 1 ? [createButtons(currentPage)] : [];

            const response = await interaction.editReply({
                embeds: [embed],
                components: components
            });

            if (totalPages > 1) {
                const collector = response.createMessageComponentCollector({
                    componentType: 2, // Button component type
                    time: 60000
                });

                collector.on('collect', async (buttonInteraction) => {
                    if (buttonInteraction.user.id !== interaction.user.id) {
                        return await buttonInteraction.reply({
                            content: '❌ You cannot use these buttons.',
                            ephemeral: true
                        });
                    }

                    if (buttonInteraction.customId === 'prev') {
                        currentPage--;
                    } else if (buttonInteraction.customId === 'next') {
                        currentPage++;
                    }

                    const newEmbed = createEmbed(currentPage);
                    const newComponents = [createButtons(currentPage)];

                    try {
                        await buttonInteraction.update({
                            embeds: [newEmbed],
                            components: newComponents
                        });
                    } catch (error) {
                        console.error('Error updating button interaction:', error);
                    }
                });

                collector.on('end', async () => {
                    try {
                        await interaction.editReply({ components: [] });
                    } catch (error) {
                        // Ignore error if message was already deleted
                    }
                });
            }
        } catch (error) {
            console.error('Error in roles command:', error);
            
            const reply = {
                content: '❌ Failed to fetch server roles. Please try again later.',
                ephemeral: true
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};