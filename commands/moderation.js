
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor;
}

function getErrorColor(client) {
    return client.config?.ErrorColor;
}



module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Server moderation commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Ban a member from the server')
                .addUserOption(option =>
                    option
                        .setName('member')
                        .setDescription('The member to ban')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the ban')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Unban a user from the server')
                .addStringOption(option =>
                    option
                        .setName('userid')
                        .setDescription('The user ID to unban')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the unban')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('timeout')
                .setDescription('Timeout a member (1m to 32d)')
                .addUserOption(option =>
                    option
                        .setName('member')
                        .setDescription('The member to timeout')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('duration')
                        .setDescription('Duration (e.g., 1m, 1h, 1d) - max 28d')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the timeout')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('untimeout')
                .setDescription('Remove timeout from a member')
                .addUserOption(option =>
                    option
                        .setName('member')
                        .setDescription('The member to remove timeout from')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for removing timeout')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Kick a member from the server')
                .addUserOption(option =>
                    option
                        .setName('member')
                        .setDescription('The member to kick')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the kick')
                        .setRequired(false)))
        ,

    async execute(interaction) {
        // Check if user has permission to use application commands
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ You need the "Use Application Commands" permission to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has permission to use application commands
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ I need the "Use Application Commands" permission to execute this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'ban':
                    await handleBan(interaction);
                    break;
                case 'unban':
                    await handleUnban(interaction);
                    break;
                case 'timeout':
                    await handleTimeout(interaction);
                    break;
                case 'untimeout':
                    await handleUntimeout(interaction);
                    break;
                case 'kick':
                    await handleKick(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in moderation command:', error);
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

async function handleBan(interaction) {
    // Check ban permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return await interaction.reply({
            content: '❌ You need the "Ban Members" permission to use this command.',
            ephemeral: true
        });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        return await interaction.reply({
            content: '❌ I need the "Ban Members" permission to execute this command.',
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        // Check if user is trying to ban themselves
        if (targetUser.id === interaction.user.id) {
            return await interaction.editReply({
                content: '❌ You cannot ban yourself.'
            });
        }

        // Check if user is trying to ban the bot
        if (targetUser.id === interaction.client.user.id) {
            return await interaction.editReply({
                content: '❌ I cannot ban myself.'
            });
        }

        // Get member object to check permissions and hierarchy
        let targetMember;
        try {
            targetMember = await interaction.guild.members.fetch(targetUser.id);
        } catch {
            targetMember = null;
        }

        // If user is in the server, check role hierarchy
        if (targetMember) {
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
                return await interaction.editReply({
                    content: '❌ You cannot ban this user as they have a higher or equal role than you.'
                });
            }

            if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
                return await interaction.editReply({
                    content: '❌ I cannot ban this user as they have a higher or equal role than me.'
                });
            }

            if (targetUser.id === interaction.guild.ownerId) {
                return await interaction.editReply({
                    content: '❌ You cannot ban the server owner.'
                });
            }
        }

        // Check if user is already banned
        try {
            await interaction.guild.bans.fetch(targetUser.id);
            return await interaction.editReply({
                content: '❌ This user is already banned.'
            });
        } catch {
            // User is not banned, continue
        }

        // Execute the ban
        await interaction.guild.members.ban(targetUser, {
            reason: `${reason} | Banned by: ${interaction.user.tag} (${interaction.user.id})`
        });

        const successEmbed = new EmbedBuilder()
            .setTitle('🔨 User Banned Successfully')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Banned by', value: interaction.user.tag, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error banning user:', error);
        await interaction.editReply({
            content: '❌ Failed to ban the user. Please check my permissions and try again.'
        });
    }
}

async function handleUnban(interaction) {
    // Check ban permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return await interaction.reply({
            content: '❌ You need the "Ban Members" permission to use this command.',
            ephemeral: true
        });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
        return await interaction.reply({
            content: '❌ I need the "Ban Members" permission to execute this command.',
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        // Check if user is banned
        let bannedUser;
        try {
            bannedUser = await interaction.guild.bans.fetch(userId);
        } catch {
            return await interaction.editReply({
                content: '❌ This user is not banned.'
            });
        }

        // Unban the user
        await interaction.guild.members.unban(userId, `${reason} | Unbanned by: ${interaction.user.tag} (${interaction.user.id})`);

        const successEmbed = new EmbedBuilder()
            .setTitle('✅ User Unbanned Successfully')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'User', value: `${bannedUser.user.tag} (${bannedUser.user.id})`, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Unbanned by', value: interaction.user.tag, inline: true }
            )
            .setThumbnail(bannedUser.user.displayAvatarURL())
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error unbanning user:', error);
        await interaction.editReply({
            content: '❌ Failed to unban the user. Please check my permissions and try again.'
        });
    }
}

async function handleTimeout(interaction) {
    // Check timeout permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return await interaction.reply({
            content: '❌ You need the "Moderate Members" permission to use this command.',
            ephemeral: true
        });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return await interaction.reply({
            content: '❌ I need the "Moderate Members" permission to execute this command.',
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('member');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return await interaction.editReply({
                content: '❌ User is not in this server.'
            });
        }

        // Check hierarchy
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            return await interaction.editReply({
                content: '❌ You cannot timeout this user as they have a higher or equal role than you.'
            });
        }

        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return await interaction.editReply({
                content: '❌ I cannot timeout this user as they have a higher or equal role than me.'
            });
        }

        // Parse duration
        const timeoutMs = parseDuration(duration);
        if (!timeoutMs || timeoutMs < 60000 || timeoutMs > 28 * 24 * 60 * 60 * 1000) {
            return await interaction.editReply({
                content: '❌ Invalid duration. Please use format like 1m, 1h, 1d (minimum 1m, maximum 28d).'
            });
        }

        // Apply timeout
        await targetMember.timeout(timeoutMs, `${reason} | Timeout by: ${interaction.user.tag} (${interaction.user.id})`);

        const successEmbed = new EmbedBuilder()
            .setTitle('⏰ User Timed Out Successfully')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Duration', value: duration, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Timed out by', value: interaction.user.tag, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error timing out user:', error);
        await interaction.editReply({
            content: '❌ Failed to timeout the user. Please check my permissions and try again.'
        });
    }
}

async function handleUntimeout(interaction) {
    // Check timeout permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return await interaction.reply({
            content: '❌ You need the "Moderate Members" permission to use this command.',
            ephemeral: true
        });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return await interaction.reply({
            content: '❌ I need the "Moderate Members" permission to execute this command.',
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return await interaction.editReply({
                content: '❌ User is not in this server.'
            });
        }

        if (!targetMember.communicationDisabledUntil) {
            return await interaction.editReply({
                content: '❌ This user is not timed out.'
            });
        }

        // Remove timeout
        await targetMember.timeout(null, `${reason} | Timeout removed by: ${interaction.user.tag} (${interaction.user.id})`);

        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Timeout Removed Successfully')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Timeout removed by', value: interaction.user.tag, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error removing timeout:', error);
        await interaction.editReply({
            content: '❌ Failed to remove timeout. Please check my permissions and try again.'
        });
    }
}

async function handleKick(interaction) {
    // Check kick permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        return await interaction.reply({
            content: '❌ You need the "Kick Members" permission to use this command.',
            ephemeral: true
        });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
        return await interaction.reply({
            content: '❌ I need the "Kick Members" permission to execute this command.',
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return await interaction.editReply({
                content: '❌ User is not in this server.'
            });
        }

        // Check if user is trying to kick themselves
        if (targetUser.id === interaction.user.id) {
            return await interaction.editReply({
                content: '❌ You cannot kick yourself.'
            });
        }

        // Check hierarchy
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            return await interaction.editReply({
                content: '❌ You cannot kick this user as they have a higher or equal role than you.'
            });
        }

        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return await interaction.editReply({
                content: '❌ I cannot kick this user as they have a higher or equal role than me.'
            });
        }

        if (targetUser.id === interaction.guild.ownerId) {
            return await interaction.editReply({
                content: '❌ You cannot kick the server owner.'
            });
        }

        // Execute kick
        await targetMember.kick(`${reason} | Kicked by: ${interaction.user.tag} (${interaction.user.id})`);

        const successEmbed = new EmbedBuilder()
            .setTitle('👢 User Kicked Successfully')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Kicked by', value: interaction.user.tag, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error kicking user:', error);
        await interaction.editReply({
            content: '❌ Failed to kick the user. Please check my permissions and try again.'
        });
    }
}



// Helper function to parse duration strings
function parseDuration(durationStr) {
    const match = durationStr.match(/^(\d+)([smhd])$/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}
