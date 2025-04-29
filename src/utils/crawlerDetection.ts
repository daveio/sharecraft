export function checkForSocialCrawler(userAgent: string): boolean {
  // Common social media crawler user agents
  const socialCrawlers = [
    "facebookexternalhit",
    "Twitterbot",
    "LinkedInBot",
    "WhatsApp",
    "Slackbot",
    "TelegramBot",
    "discord",
    "Discordbot",
    "Pinterest",
    "Googlebot",
  ];

  return socialCrawlers.some((crawler) => userAgent.toLowerCase().includes(crawler.toLowerCase()));
}
