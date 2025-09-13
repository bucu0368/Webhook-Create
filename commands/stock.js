const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor || '#0099ff';
}

function getErrorColor(client) {
    return client.config?.ErrorColor || '#ff0000';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stock')
        .setDescription('Display current Grow a Garden stock information'),

    async execute(interaction) {
        // Send initial loading message
        const sent = await interaction.reply({ content: 'Loading...', fetchReply: true });

        try {
            // Fetch stock data from the API
            const response = await fetch('https://growagarden.gg/api/stock');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const stockData = await response.json();

            // Helper function to format stock items
            function formatStockCategory(category, maxItems = 10) {
                if (!category || !Array.isArray(category)) return 'No data available';
                
                return category.slice(0, maxItems).map(item => 
                    `${item.name || 'Unknown'} - ${item.value || '0'}`
                ).join('\n') || 'No items available';
            }

            // Create the embed
            const embed = new EmbedBuilder()
                .setAuthor({ 
                    name: `${interaction.client.user.username} • Grow a Garden Stocks`,
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setColor(getEmbedColor(interaction.client))
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .setTimestamp()

            // Add stock fields
            if (stockData.seedsStock) {
                embed.addFields({
                    name: '**SEEDS STOCK**:',
                    value: formatStockCategory(stockData.seedsStock, 9),
                    inline: false
                });
            }

            if (stockData.gearStock) {
                embed.addFields({
                    name: '**GEAR STOCK**:',
                    value: formatStockCategory(stockData.gearStock, 9),
                    inline: false
                });
            }

            if (stockData.eggStock) {
                embed.addFields({
                    name: '**EGG STOCK**:',
                    value: formatStockCategory(stockData.eggStock, 4),
                    inline: false
                });
            }

            if (stockData.eventStock) {
                embed.addFields({
                    name: '**EVENT STOCK**:',
                    value: formatStockCategory(stockData.eventStock, 2),
                    inline: false
                });
            }

            if (stockData.cosmeticsStock) {
                embed.addFields({
                    name: '**COSMETICS STOCK**:',
                    value: formatStockCategory(stockData.cosmeticsStock, 10),
                    inline: false
                });
            }

            // Edit the original loading message with the embed
            await interaction.editReply({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('Error fetching stock data:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to fetch stock data from the API. Please try again later.')
                .setColor(getErrorColor(interaction.client))
                .addFields({
                    name: 'Error Details',
                    value: error.message || 'Unknown error occurred',
                    inline: false
                })
                .setTimestamp();

            await interaction.editReply({ content: null, embeds: [errorEmbed] });
        }
    },
};