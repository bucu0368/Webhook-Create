
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
        .setName('setnick')
        .setDescription('Set a nickname for a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames | PermissionFlagsBits.UseApplicationCommands)
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to set nickname for')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('nickname')
                .setDescription('The new nickname')
                .setRequired(true)
                .setMaxLength(32)),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames) || 
            !interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ You need "Manage Nicknames" and "Use Application Commands" permissions to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames) || 
            !interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ I need "Manage Nicknames" and "Use Application Commands" permissions to execute this command.',
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('user');
        const newNickname = interaction.options.getString('nickname');

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

            // Check if user is trying to change their own nickname (they need Change Nickname permission for this)
            if (targetUser.id === interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.ChangeNickname)) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ **Permission Error**\nYou need "Change Nickname" permission to change your own nickname.`)
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Check if target is server owner
            if (targetUser.id === interaction.guild.ownerId) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ **Permission Error**\nYou cannot change the server owner's nickname.`)
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Check if target is the bot itself
            if (targetUser.id === interaction.client.user.id) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ **Permission Error**\nI cannot change my own nickname through this command.`)
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Check hierarchy (user can't change nickname of someone with higher or equal role)
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && 
                interaction.guild.ownerId !== interaction.user.id && 
                targetUser.id !== interaction.user.id) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ **Role Hierarchy Error**\nYou cannot change the nickname of ${targetUser.tag} because they have a higher or equal role than you.`)
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Check if bot can change this member's nickname (hierarchy check)
            if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ **Role Hierarchy Error**\nI cannot change the nickname of ${targetUser.tag} because they have a higher or equal role than me.`)
                    );

                return await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Store old nickname for display
            const oldNickname = targetMember.nickname || targetUser.username;

            // Set the new nickname
            await targetMember.setNickname(newNickname, `Nickname changed by ${interaction.user.tag} (${interaction.user.id})`);

            // Create success container
            const successContainer = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client));

            // Determine the action performed
            const action = newNickname ? 'Set' : 'Cleared';
            const displayNickname = newNickname || targetUser.username;

            // Add header section
            successContainer.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`✅ **Nickname ${action} Successfully**\n${targetUser.tag}'s nickname has been ${action.toLowerCase()}`)
            );

            successContainer.addSeparatorComponents(separator => separator);

            // Add details section
            successContainer.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**👤 Nickname Change Details**\n**User:** ${targetUser.tag}\n**User ID:** ${targetUser.id}\n**Old Nickname:** ${oldNickname}\n**New Nickname:** ${displayNickname}\n**Changed by:** ${interaction.user.tag}`)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(targetUser.displayAvatarURL({ dynamic: true }))
                    )
            );

            successContainer.addSeparatorComponents(separator => separator);

            // Add additional info
            const memberInfo = [
                `**Join Date:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`,
                `**Account Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
                `**Roles:** ${targetMember.roles.cache.size - 1}`, // -1 to exclude @everyone
                `**Highest Role:** ${targetMember.roles.highest.name}`
            ].join('\n');

            successContainer.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**📋 Member Information**\n${memberInfo}`)
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
            console.error('Error setting nickname:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **Nickname Change Failed**\nFailed to ${newNickname ? 'set' : 'clear'} nickname for ${targetUser.tag}. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
                );

            await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};
