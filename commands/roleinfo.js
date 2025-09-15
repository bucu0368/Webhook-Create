
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Display detailed information about a role')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to get information about')
                .setRequired(true)),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ You need the "Use Application Commands" permission to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ I need the "Use Application Commands" permission to execute this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const role = interaction.options.getRole('role');
            const guild = interaction.guild;

            // Get role statistics
            const membersWithRole = guild.members.cache.filter(member => member.roles.cache.has(role.id)).size;
            const rolePermissions = role.permissions.toArray();
            const isEveryone = role.id === guild.id;

            // Format role color
            const roleColor = role.hexColor || '#000000';

            // Format creation date
            const createdTimestamp = Math.floor(role.createdAt.getTime() / 1000);

            // Build the container
            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client) || 0x0099FF);

            // Add main role information
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`🎭 **Role Information**\n**Name:** ${role.name}\n**ID:** \`${role.id}\`\n**Mention:** <@&${role.id}>`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add role details section
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**📊 Role Details**\n**Position:** ${role.position}/${guild.roles.cache.size}\n**Color:** ${roleColor}\n**Hoisted:** ${role.hoist ? '✅ Yes' : '❌ No'}\n**Mentionable:** ${role.mentionable ? '✅ Yes' : '❌ No'}\n**Managed:** ${role.managed ? '✅ Yes (Bot/Integration)' : '❌ No'}\n**Members:** ${membersWithRole.toLocaleString()}`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add creation info section
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**📅 Creation Info**\n**Created:** <t:${createdTimestamp}:F>\n**Created:** <t:${createdTimestamp}:R>`)
            );

            // Add permissions section if role has any
            if (rolePermissions.length > 0 && !isEveryone) {
                container.addSeparatorComponents(separator => separator);

                // Group permissions into categories
                const adminPerms = [];
                const generalPerms = [];
                const textPerms = [];
                const voicePerms = [];

                rolePermissions.forEach(perm => {
                    if (['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'ManageMessages', 'BanMembers', 'KickMembers', 'ManageNicknames', 'ManageWebhooks'].includes(perm)) {
                        adminPerms.push(perm);
                    } else if (['SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles', 'UseExternalEmojis', 'AddReactions', 'MentionEveryone'].includes(perm)) {
                        textPerms.push(perm);
                    } else if (['Connect', 'Speak', 'MuteMembers', 'DeafenMembers', 'MoveMembers', 'UseVAD'].includes(perm)) {
                        voicePerms.push(perm);
                    } else {
                        generalPerms.push(perm);
                    }
                });

                let permissionsText = `**🔐 Permissions (${rolePermissions.length})**\n`;

                if (adminPerms.length > 0) {
                    permissionsText += `\n**Administrative:**\n${adminPerms.map(p => `• ${p}`).join('\n')}\n`;
                }
                if (generalPerms.length > 0) {
                    permissionsText += `\n**General:**\n${generalPerms.map(p => `• ${p}`).join('\n')}\n`;
                }
                if (textPerms.length > 0) {
                    permissionsText += `\n**Text:**\n${textPerms.map(p => `• ${p}`).join('\n')}\n`;
                }
                if (voicePerms.length > 0) {
                    permissionsText += `\n**Voice:**\n${voicePerms.map(p => `• ${p}`).join('\n')}`;
                }

                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(permissionsText.substring(0, 1024)) // Discord limit
                );
            }

            // Add footer
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`Requested by ${interaction.member?.displayName || interaction.user.tag}`)
            );

            await interaction.editReply({ 
                components: [container], 
                flags: MessageFlags.IsComponentsV2 
            });

        } catch (error) {
            console.error('Error in roleinfo command:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **Error**\nFailed to fetch role information. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
                );

            const reply = {
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};
