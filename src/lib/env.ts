export function getAppUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function getPublicMediaBaseUrl(): string {
  const override = process.env.PUBLIC_MEDIA_BASE_URL?.trim();
  if (override) {
    return override.replace(/\/+$/, "");
  }
  return getAppUrl();
}

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      process.env.S3_PUBLIC_BASE_URL
  );
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${getAppUrl()}/api/auth/youtube/callback`;
  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

export function getMetaOAuthConfig() {
  const appId = process.env.META_APP_ID?.trim() || "";
  const appSecret = process.env.META_APP_SECRET?.trim() || "";
  const configId = process.env.META_CONFIG_ID?.trim() || "";
  return {
    appId,
    appSecret,
    configId,
    redirectUri: `${getAppUrl()}/api/auth/instagram/callback`,
    isConfigured: Boolean(appId && appSecret),
  };
}
