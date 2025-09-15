
const { SlashCommandBuilder, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

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
        .setName('scripts')
        .setDescription('Script-related commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('scriptblox')
                .setDescription('Search for scripts on ScriptBlox')
                .addStringOption(option =>
                    option
                        .setName('query')
                        .setDescription('Search query for scripts')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'scriptblox':
                    await handleScriptBloxSearch(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in scripts command:', error);
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

async function handleScriptBloxSearch(interaction) {
    const query = interaction.options.getString('query');
    
    await interaction.deferReply();

    try {
        const response = await fetch(`https://scriptblox.com/api/script/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.result || !data.result.scripts || data.result.scripts.length === 0) {
            const noResultsContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client) || 0xFF0000)
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`🔍 **ScriptBlox Search**\nNo scripts found for query: **${query}**`)
                );

            return await interaction.editReply({ components: [noResultsContainer], flags: MessageFlags.IsComponentsV2 });
        }

        // Create containers for pagination
        const containers = [];
        const scripts = data.result.scripts;
        const itemsPerPage = 5;

        for (let i = 0; i < scripts.length; i += itemsPerPage) {
            const pageScripts = scripts.slice(i, i + itemsPerPage);
            const container = createScriptContainer(pageScripts, query, i, scripts.length, interaction.client);
            containers.push(container);
        }

        // Use pagination if multiple pages, otherwise show single page
        if (containers.length > 1) {
            await pagination(interaction, containers, false);
        } else {
            await interaction.editReply({ components: [containers[0]], flags: MessageFlags.IsComponentsV2 });
        }

    } catch (error) {
        console.error('Error searching ScriptBlox:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client) || 0xFF0000)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`❌ **ScriptBlox Search Failed**\nSorry, I couldn't search ScriptBlox. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
            );

        await interaction.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    }
}

function createScriptContainer(scripts, query, startIndex, totalScripts, client) {
    const container = new ContainerBuilder()
        .setAccentColor(getEmbedColor(client) || 0x0099FF);

    // Add header section
    container.addTextDisplayComponents(
        textDisplay => textDisplay
            .setContent(`🔍 **ScriptBlox Search Results**\nSearch query: **${query}**\nTotal results: ${totalScripts}`)
    );

    container.addSeparatorComponents(separator => separator);

    // Add each script as a section
    scripts.forEach((script, index) => {
        const globalIndex = startIndex + index + 1;
        const title = script.title || 'Untitled Script';
        const game = script.game?.name || 'Unknown Game';
        const verified = script.isVerified ? '✅' : '❌';
        const views = script.views || 0;
        const url = `https://scriptblox.com/script/${script.slug}`;

        container.addSectionComponents(
            section => section
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**${globalIndex}. ${title}**\n**Game:** ${game}\n**Verified:** ${verified}\n**Views:** ${views.toLocaleString()}`)
                )
                .setButtonAccessory(
                    button => button
                        .setLabel('View Script')
                        .setStyle(ButtonStyle.Link)
                        .setURL(url)
                )
        );
    });

    return container;
}

/**
 * Container pagination
 *
 * @param {BaseInteraction} interaction - The interaction that triggers the pagination.
 * @param {Array} components - The containers to show.
 * @param {boolean} ephemeral - Whether the pagination will be ephemeral or not.
 */
async function pagination(interaction, components, ephemeral) {
    try {
        if (!interaction || !components || components.length === 0) {
            throw new Error('[PAGINATION] Invalid args');
        }

        if (components.length === 1) {
            return await interaction.editReply({ components: components, flags: MessageFlags.IsComponentsV2, fetchReply: true });
        }

        let index = 0;

        const first = new ButtonBuilder()
            .setCustomId('pagefirst')
            .setEmoji('⏪')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        const prev = new ButtonBuilder()
            .setCustomId('pageprev')
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        const pageCount = new ButtonBuilder()
            .setCustomId('pagecount')
            .setLabel(`${index + 1}/${components.length}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const next = new ButtonBuilder()
            .setCustomId('pagenext')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Primary);

        const last = new ButtonBuilder()
            .setCustomId('pagelast')
            .setEmoji('⏩')
            .setStyle(ButtonStyle.Primary);

        const buttons = new ActionRowBuilder().addComponents([first, prev, pageCount, next, last]);

        const msg = await interaction.editReply({ 
            components: [components[index], buttons], 
            flags: MessageFlags.IsComponentsV2,
            fetchReply: true 
        });

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 180000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return await i.reply({ 
                    content: `Only **${interaction.user.username}** can use these buttons.`, 
                    ephemeral: true 
                });
            }

            if (i.customId === 'pagefirst') {
                index = 0;
            } else if (i.customId === 'pageprev') {
                if (index > 0) index--;
            } else if (i.customId === 'pagenext') {
                if (index < components.length - 1) index++;
            } else if (i.customId === 'pagelast') {
                index = components.length - 1;
            }

            pageCount.setLabel(`${index + 1}/${components.length}`);

            // Update button states
            first.setDisabled(index === 0);
            prev.setDisabled(index === 0);
            next.setDisabled(index === components.length - 1);
            last.setDisabled(index === components.length - 1);

            await i.update({ 
                components: [components[index], buttons],
                flags: MessageFlags.IsComponentsV2
            }).catch(err => {
                console.error(`[ERROR] ${err.message}`);
            });

            collector.resetTimer();
        });

        collector.on("end", () => {
            return interaction.editReply({ 
                components: [components[index]], 
                flags: MessageFlags.IsComponentsV2
            }).catch(err => {
                console.error(`[ERROR] ${err.message}`);
            });
        });

        return msg;

    } catch (e) {
        console.error(`[ERROR] ${e}`);
    }
}
