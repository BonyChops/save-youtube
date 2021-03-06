var fs = require('fs');
var readline = require('readline');
var { google } = require('googleapis');
var OAuth2 = google.auth.OAuth2;
const input = require("input")

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'save-youtube.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
    }
    // Authorize a client with the loaded credentials, then call the YouTube API.
    //authorize(JSON.parse(content), getChannel);
    authorize(JSON.parse(content), getComments);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) throw err;
        console.log('Token stored to ' + TOKEN_PATH);
    });
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getChannel(auth) {
    var service = google.youtube('v3');
    service.channels.list({
        auth: auth,
        part: 'snippet,contentDetails,statistics',
        forUsername: 'GoogleDevelopers'
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var channels = response.data.items;
        if (channels.length == 0) {
            console.log('No channel found.');
        } else {
            console.log('This channel\'s ID is %s. Its title is \'%s\', and ' +
                'it has %s views.',
                channels[0].id,
                channels[0].snippet.title,
                channels[0].statistics.viewCount);
        }
    });
}

const getComments = async (auth) => {
    const youtube = google.youtube('v3');
    const comments = [];
    let pageToken = "";
    const limit = 20;
    for (let i = 0; i < 1; i++) {
        const result = await youtube.commentThreads.list({
            auth,
            part: "snippet",
            videoId: await input.text("Input Video id"),
            maxResults: 100,
            pageToken,
            order: "relevance"
        });
        pageToken = result.data.nextPageToken;
        console.log(result.data.items)
        Array.prototype.push.apply(comments, result.data.items.filter(comment => comment.snippet.totalReplyCount > 0));
    }
    comments.sort((firstEl, secondEl) => (secondEl.snippet.totalReplyCount - firstEl.snippet.totalReplyCount))

    fs.writeFileSync("test.json", JSON.stringify(comments, null, 2));
    const replies = [];
    let counter = 0;

    for(let comment of comments){
        const result = await youtube.comments.list({
            auth,
            part: "snippet",
            maxResults: 100,
            parentId: comment.id
        });
        Array.prototype.push.apply(replies, result.data.items);
        console.log(result.data.items);
        counter += 1;
        if(counter > limit){
            break;
        }
    }
    fs.writeFileSync("test2.json", JSON.stringify(replies, null, 2));
    const spamLinks = JSON.parse(fs.readFileSync("spamLink.json"));
    const spamComments = replies.filter(comment => spamLinks.some(link => comment.snippet.textOriginal.indexOf(link) !== -1));
    fs.writeFileSync("spam.json", JSON.stringify(spamComments, null, 2));


}