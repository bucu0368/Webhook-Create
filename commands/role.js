
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
        .setName('role')
        .setDescription('Role management commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles | PermissionFlagsBits.UseApplicationCommands)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a role to a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to add the role to')
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The role to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role from a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to remove the role from')
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('removeall')
                .setDescription('Remove all roles from a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to remove all roles from')
                        .setRequired(true))),

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

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'add':
                    await handleAddRole(interaction);
                    break;
                case 'remove':
                    await handleRemoveRole(interaction);
                    break;
                case 'removeall':
                    await handleRemoveAllRoles(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in role command:', error);
            const reply = {
                content: '❌ An error occurred while executing the command.',
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

async function handleAddRole(interaction) {
    const targetUser = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');

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

        // Check if role is @everyone
        if (role.id === interaction.guild.id) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **Invalid Role**\nYou cannot manage the @everyone role.`)
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

        // Check if user already has the role
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
                        .setContent(`**👤 Role Addition Details**\n**User:** ${targetUser.tag}\n**User ID:** ${targetUser.id}\n**Role:** ${role.name}\n**Role ID:** ${role.id}\n**Added by:** ${interaction.user.tag}`)
                )
                .setThumbnailAccessory(
                    thumbnail => thumbnail
                        .setURL(targetUser.displayAvatarURL({ dynamic: true }))
                )
        );

        successContainer.addSeparatorComponents(separator => separator);

        // Add member info
        const memberInfo = [
            `**Total Roles:** ${targetMember.roles.cache.size}`,
            `**Join Date:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`,
            `**Account Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
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
}

async function handleRemoveRole(interaction) {
    const targetUser = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');

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

        // Check if role is @everyone
        if (role.id === interaction.guild.id) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **Invalid Role**\nYou cannot manage the @everyone role.`)
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

        // Check if user doesn't have the role
        if (!targetMember.roles.cache.has(role.id)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **Role Not Found**\n${targetUser.tag} doesn't have the role **${role.name}**.`)
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Remove the role from the member
        await targetMember.roles.remove(role, `Role removed by ${interaction.user.tag} (${interaction.user.id})`);

        // Create success container
        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client));

        // Add header section
        successContainer.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`✅ **Role Removed Successfully**\nRole **${role.name}** has been removed from ${targetUser.tag}`)
        );

        successContainer.addSeparatorComponents(separator => separator);

        // Add details section
        successContainer.addSectionComponents(
            section => section
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**👤 Role Removal Details**\n**User:** ${targetUser.tag}\n**User ID:** ${targetUser.id}\n**Role:** ${role.name}\n**Role ID:** ${role.id}\n**Removed by:** ${interaction.user.tag}`)
                )
                .setThumbnailAccessory(
                    thumbnail => thumbnail
                        .setURL(targetUser.displayAvatarURL({ dynamic: true }))
                )
        );

        successContainer.addSeparatorComponents(separator => separator);

        // Add member info
        const memberInfo = [
            `**Total Roles:** ${targetMember.roles.cache.size - 1}`, // -1 to exclude @everyone
            `**Join Date:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`,
            `**Account Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
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
        console.error('Error removing role:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`❌ **Role Removal Failed**\nFailed to remove role **${role.name}** from ${targetUser.tag}. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleRemoveAllRoles(interaction) {
    const targetUser = interaction.options.getUser('user');

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

        // Check if target is server owner
        if (targetUser.id === interaction.guild.ownerId) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **Permission Error**\nYou cannot remove roles from the server owner.`)
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
                        .setContent(`❌ **Permission Error**\nI cannot remove my own roles through this command.`)
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Check hierarchy (user can't remove roles from someone with higher or equal role)
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && 
            interaction.guild.ownerId !== interaction.user.id && 
            targetUser.id !== interaction.user.id) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **Role Hierarchy Error**\nYou cannot remove roles from ${targetUser.tag} because they have a higher or equal role than you.`)
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Check if bot can manage this member's roles (hierarchy check)
        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **Role Hierarchy Error**\nI cannot remove roles from ${targetUser.tag} because they have a higher or equal role than me.`)
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Get all roles except @everyone
        const rolesToRemove = targetMember.roles.cache.filter(role => role.id !== interaction.guild.id);

        if (rolesToRemove.size === 0) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **No Roles to Remove**\n${targetUser.tag} has no roles that can be removed (excluding @everyone).`)
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Store role names for display
        const roleNames = rolesToRemove.map(role => role.name).join(', ');
        const roleCount = rolesToRemove.size;

        // Remove all roles
        await targetMember.roles.set([], `All roles removed by ${interaction.user.tag} (${interaction.user.id})`);

        // Create success container
        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client));

        // Add header section
        successContainer.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`✅ **All Roles Removed Successfully**\nAll ${roleCount} roles have been removed from ${targetUser.tag}`)
        );

        successContainer.addSeparatorComponents(separator => separator);

        // Add details section
        successContainer.addSectionComponents(
            section => section
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**👤 Role Removal Details**\n**User:** ${targetUser.tag}\n**User ID:** ${targetUser.id}\n**Roles Removed:** ${roleCount}\n**Removed by:** ${interaction.user.tag}`)
                )
                .setThumbnailAccessory(
                    thumbnail => thumbnail
                        .setURL(targetUser.displayAvatarURL({ dynamic: true }))
                )
        );

        successContainer.addSeparatorComponents(separator => separator);

        // Add removed roles section
        const rolesText = roleNames.length > 1000 ? 
            roleNames.substring(0, 997) + '...' : 
            roleNames;

        successContainer.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**🗑️ Removed Roles**\n${rolesText}`)
        );

        successContainer.addSeparatorComponents(separator => separator);

        // Add member info
        const memberInfo = [
            `**Current Roles:** 1 (@everyone only)`,
            `**Join Date:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`,
            `**Account Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
            `**Current Highest Role:** @everyone`
        ].join('\n');

        successContainer.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**📋 Updated Member Information**\n${memberInfo}`)
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
        console.error('Error removing all roles:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`❌ **Role Removal Failed**\nFailed to remove all roles from ${targetUser.tag}. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}
