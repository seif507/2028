const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ]
});

const spamMap = new Map();

client.once('ready', () => {
  console.log(`🔥 ${client.user.tag} READY`);
});

// ===== WELCOME =====
client.on('guildMemberAdd', async (member) => {
  if (config.autoRoleId) member.roles.add(config.autoRoleId).catch(()=>{});
  const ch = member.guild.channels.cache.get(config.welcomeChannelId);
  if (ch) ch.send(`👋 Welcome ${member}`);
});

// ===== MESSAGE =====
client.on('messageCreate', async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  const args = msg.content.split(' ');
  const cmd = args.shift().toLowerCase();

  const isAdmin = msg.member.permissions.has(PermissionsBitField.Flags.Administrator);

  // ===== ANTISPAM =====
  if (config.antiSpam.enabled) {
    const data = spamMap.get(msg.author.id) || { count: 0, last: Date.now() };
    data.count++;

    if (Date.now() - data.last < config.antiSpam.intervalMs && data.count >= config.antiSpam.messageLimit) {
      msg.member.timeout(config.antiSpam.timeoutMinutes * 60 * 1000).catch(()=>{});
      msg.channel.send(`🚫 ${msg.author} سبام`);
      data.count = 0;
    }

    data.last = Date.now();
    spamMap.set(msg.author.id, data);
  }

  if (!cmd.startsWith(config.prefix)) return;

  // ===== ADMIN ONLY =====
  if (config.adminOnly && !isAdmin) return;

  // ping
  if (cmd === config.prefix + 'ping') return msg.reply('🏓 Pong');

  // ban
  if (cmd === config.prefix + 'ban') {
    const user = msg.mentions.members.first();
    if (!user) return msg.reply('حدد شخص');
    user.ban().then(()=> msg.reply('تم البان'));
  }

  // kick
  if (cmd === config.prefix + 'kick') {
    const user = msg.mentions.members.first();
    if (!user) return msg.reply('حدد شخص');
    user.kick().then(()=> msg.reply('تم الطرد'));
  }

  // clear
  if (cmd === config.prefix + 'clear') {
    const num = parseInt(args[0]);
    msg.channel.bulkDelete(num).then(()=> msg.channel.send('تم'));
  }

  // say
  if (cmd === config.prefix + 'say') {
    msg.delete().catch(()=>{});
    msg.channel.send(args.join(' '));
  }

  // ticket panel
  if (cmd === config.prefix + 'ticket') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket').setLabel('فتح تكت').setStyle(ButtonStyle.Primary)
    );
    msg.channel.send({ content: 'اضغط لفتح تكت', components: [row] });
  }

  // suggest
  if (cmd === config.prefix + 'suggest') {
    const embed = new EmbedBuilder().setTitle('💡 Suggestion').setDescription(args.join(' '));
    const ch = msg.guild.channels.cache.get(config.suggestChannelId);
    if (ch) ch.send({ embeds: [embed] }).then(m => { m.react('👍'); m.react('👎'); });
  }
});

// ===== BUTTON =====
client.on('interactionCreate', async (i) => {
  if (!i.isButton()) return;

  if (i.customId === 'ticket') {
    const ch = await i.guild.channels.create({
      name: `ticket-${i.user.username}`,
      type: ChannelType.GuildText,
      parent: config.ticketCategoryId
    });

    ch.send(`🎫 ${i.user} دعمك هنا`);
    i.reply({ content: 'تم فتح التكت', ephemeral: true });
  }
});

client.login(config.token);
