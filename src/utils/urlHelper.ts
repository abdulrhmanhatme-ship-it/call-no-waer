// Helper to get the public shareable URL that external users can open without Google AI Studio login

export function getPublicShareUrl(channelId: string = 'general'): string {
  if (typeof window === 'undefined') {
    return `/?channel=${encodeURIComponent(channelId)}`;
  }

  const origin = window.location.origin;
  const path = window.location.pathname;

  if (channelId === 'general') {
    return `${origin}${path}`;
  }

  return `${origin}${path}?channel=${encodeURIComponent(channelId)}`;
}
