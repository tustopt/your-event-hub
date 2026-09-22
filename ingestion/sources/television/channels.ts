export interface TelevisionChannelDefinition {
  broadcasterKey: string;
  channelKey: string;
  channel: string;
  canonicalUrl: string;
  countryCode: string;
  languageCode: string;
}

export const PORTUGUESE_TELEVISION_CHANNELS: readonly TelevisionChannelDefinition[] = [
  {
    broadcasterKey: "rtp",
    channelKey: "rtp1",
    channel: "RTP1",
    canonicalUrl: "https://www.rtp.pt/rtp1/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "rtp",
    channelKey: "rtp2",
    channel: "RTP2",
    canonicalUrl: "https://www.rtp.pt/rtp2/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "rtp",
    channelKey: "rtp3",
    channel: "RTP3",
    canonicalUrl: "https://www.rtp.pt/rtp3/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "rtp",
    channelKey: "rtp_memoria",
    channel: "RTP Memória",
    canonicalUrl: "https://www.rtp.pt/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "rtp",
    channelKey: "rtp_africa",
    channel: "RTP África",
    canonicalUrl: "https://www.rtp.pt/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "rtp",
    channelKey: "rtp_mundo",
    channel: "RTP Mundo",
    canonicalUrl: "https://www.rtp.pt/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "rtp",
    channelKey: "rtp_acores",
    channel: "RTP Açores",
    canonicalUrl: "https://www.rtp.pt/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "rtp",
    channelKey: "rtp_madeira",
    channel: "RTP Madeira",
    canonicalUrl: "https://www.rtp.pt/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "sic",
    channelKey: "sic",
    channel: "SIC",
    canonicalUrl: "https://sic.pt/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "sic",
    channelKey: "sic_noticias",
    channel: "SIC Notícias",
    canonicalUrl: "https://sicnoticias.pt/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "sic",
    channelKey: "sic_radical",
    channel: "SIC Radical",
    canonicalUrl: "https://sic.pt/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "sic",
    channelKey: "sic_mulher",
    channel: "SIC Mulher",
    canonicalUrl: "https://sic.pt/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "sic",
    channelKey: "sic_k",
    channel: "SIC K",
    canonicalUrl: "https://sic.pt/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "sic",
    channelKey: "sic_caras",
    channel: "SIC Caras",
    canonicalUrl: "https://sic.pt/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "tvi",
    channelKey: "tvi",
    channel: "TVI",
    canonicalUrl: "https://tvi.iol.pt/",
    countryCode: "PT",
    languageCode: "pt",
  },
  {
    broadcasterKey: "tvi",
    channelKey: "vmais",
    channel: "V+ TVI",
    canonicalUrl: "https://tvi.iol.pt/vmais/",
    countryCode: "PT",
    languageCode: "pt",
  },
];

export function getTelevisionChannel(
  broadcasterKey: string,
  channelKey: string,
): TelevisionChannelDefinition | undefined {
  return PORTUGUESE_TELEVISION_CHANNELS.find(
    (channel) =>
      channel.broadcasterKey === broadcasterKey &&
      channel.channelKey === channelKey,
  );
}
