import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const setGoogleCredentials = (tokens) => {
  try {
    console.log("[Google API] Setting credentials...", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date
    });
    
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    });
    
    oauth2Client.on('tokens', (newTokens) => {
      console.log('[Google API] Token refreshed:', {
        hasNewAccessToken: !!newTokens.access_token,
        hasNewRefreshToken: !!newTokens.refresh_token,
        newExpiryDate: newTokens.expiry_date
      });
    });
    
    return true;
  } catch (error) {
    console.error("[Google API] Error setting credentials:", error);
    return false;
  }
};

export const calendar = google.calendar({
  version: "v3",
  auth: oauth2Client,
});

export default oauth2Client;
