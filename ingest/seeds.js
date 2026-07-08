// Seed URLs for the FIM/MIM TechNet Wiki archive crawl.
// These are public archive.technet-wiki pages under learn.microsoft.com.
// The scraper follows internal "See Also" / related links from these seeds
// and keeps only pages whose title mentions FIM or MIM.
module.exports = [
  "https://learn.microsoft.com/en-us/archive/technet-wiki/33620.fimmim-resources-for-starters",
  "https://learn.microsoft.com/en-us/archive/technet-wiki/2298.fimmim-how-to-develop-and-publish-a-troubleshooting-article",
  "https://learn.microsoft.com/en-us/archive/technet-wiki/33182.identity-manager-fimmim-planning-security-setup-for-accounts-groups-and-services-part-7-additional-resources",
  "https://learn.microsoft.com/en-us/archive/technet-wiki/35789.fim-2010-archive-ramp-up-implementing-forefront-identity-manager-2010",
  "https://learn.microsoft.com/en-us/archive/technet-wiki/35636.mim-troubleshooting-sync-engine-installation-failure-error-25009-hr-0x80131700"
];
