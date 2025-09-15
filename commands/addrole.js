
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor(client) {
    const color = client.config?.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addrole')
        .setDescription('Add a role to a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles | PermissionFlagsBits.UseApplicationCommands)
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to add')
                .setRequired(true))
        .addUserOption(option =>
            option
                .setName('member')
                .setDescription('The member to add the role to')
                .setRequired(true)),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles) || 
            !interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ You need "Manage Roles" and "Use Application Commands" permissions to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles) || 
            !interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ I need "Manage Roles" and "Use Application Commands" permissions to execute this command.',
                ephemeral: true
            });
        }

        const role = interaction.options.getRole('role');
        const targetUser = interaction.options.getUser('member');

        await interaction.deferReply();

        try {
            // Fetch the target member
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            if (!targetMember) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ **Member Not Found**\nThe user ${targetUser.tag} is not in this server.`)
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Check if the role is manageable by the bot
            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ **Role Hierarchy Error**\nI cannot manage the role **${role.name}** because it is higher than or equal to my highest role.`)
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Check if the user can manage this role (hierarchy check)
            if (role.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ **Permission Error**\nYou cannot manage the role **${role.name}** because it is higher than or equal to your highest role.`)
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Check if the member already has the role
            if (targetMember.roles.cache.has(role.id)) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ **Role Already Assigned**\n${targetUser.tag} already has the role **${role.name}**.`)
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Check if it's the @everyone role
            if (role.id === interaction.guild.id) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ **Invalid Role**\nYou cannot add the @everyone role to members.`)
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Add the role to the member
            await targetMember.roles.add(role, `Role added by ${interaction.user.tag} (${interaction.user.id})`);

            // Create success container
            const successContainer = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client));

            // Add header section
            successContainer.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`✅ **Role Added Successfully**\nRole **${role.name}** has been added to ${targetUser.tag}`)
            );

            successContainer.addSeparatorComponents(separator => separator);

            // Add details section
            successContainer.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**👤 Member Information**\n**User:** ${targetUser.tag}\n**ID:** ${targetUser.id}\n**Role Added:** ${role.name}\n**Role Color:** ${role.hexColor || '#000000'}\n**Added by:** ${interaction.user.tag}`)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(targetUser.displayAvatarURL({ dynamic: true }))
                    )
            );

            successContainer.addSeparatorComponents(separator => separator);

            // Add role information
            const roleInfo = [
                `**Role ID:** ${role.id}`,
                `**Role Position:** ${role.position}`,
                `**Role Members:** ${role.members.size + 1}`, // +1 because we just added the member
                `**Mentionable:** ${role.mentionable ? 'Yes' : 'No'}`,
                `**Hoisted:** ${role.hoist ? 'Yes' : 'No'}`
            ].join('\n');

            successContainer.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**🎭 Role Information**\n${roleInfo}`)
            );

            successContainer.addSeparatorComponents(separator => separator);

            // Add footer
            successContainer.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`Action performed by: ${interaction.user.tag}`)
            );

            await interaction.editReply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error adding role:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **Role Addition Failed**\nFailed to add role **${role.name}** to ${targetUser.tag}. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
                );

            await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};
