import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const calendar = google.calendar({
  version: "v3",
  auth: oauth2Client,
});

export const setGoogleCredentials = (tokens) => {
  oauth2Client.setCredentials(tokens);
};

export default oauth2Client;
