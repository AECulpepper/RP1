// RP1 tracker settings. Neither value is a secret: the Client ID only identifies this site to
// Google, and the script refuses every request without your Google sign-in and your key.
window.RP1_CONFIG = {
  // Google Cloud > Google Auth Platform > Clients > your Web client. Ends in .apps.googleusercontent.com
  clientId: 'PASTE_CLIENT_ID_HERE',
  // Apps Script > Deploy > Manage deployments > Web app URL. Ends in /exec
  scriptUrl: 'PASTE_SCRIPT_URL_HERE',
};
