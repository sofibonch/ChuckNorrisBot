const { Telegraf } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');

const bot = new Telegraf('6865982965:AAFG9O2QH5oVvD9D-NzaeYEIprGzKsqloRM');

// Store user settings (language) in memory
const userSettings = {};

// Azure Translation API key
const translationApiKey = 'fb89e91d643942e498f67e3bd1daba87';

// Azure Translation API endpoint
const translationApiEndpoint = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';


// Language mapping object (populated dynamically)
let languageMapping = {};

// Function to fetch supported languages from Azure Translation API
const fetchSupportedLanguages = async () => {
  try {
    const response = await axios.get('https://api.cognitive.microsofttranslator.com/languages?api-version=3.0', {
      headers: {
        'Ocp-Apim-Subscription-Key': translationApiKey,
      },
    });

    // Populate the language mapping dynamically
    const supportedLanguages = Object.keys(response.data.translation);
    languageMapping = supportedLanguages.reduce((map, language) => {
      map[response.data.translation[language].name.toLowerCase()] = language;
      return map;
    }, {});

    console.log('Supported languages:', languageMapping);
  } catch (error) {
    console.error('Error fetching supported languages:', error.message);
  }
};

// Function to get language code from full language name
const getLanguageCode = (languageName) => {
  return languageMapping[languageName.toLowerCase()] || languageName;
};

const scrapeChuckNorrisJokes = async () => {
  try {
    const response = await axios.get('https://parade.com/968666/parade/chuck-norris-jokes/', {
      headers: {
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      },
    });
    const $ = cheerio.load(response.data);

    // Extract jokes from the page
    const jokes = [];
    $('ol li').each((index, element) => {
      jokes.push($(element).text().trim());
    });

    return jokes;
  } catch (error) {
    console.error('Error fetching Chuck Norris jokes:', error.message);
    return [];
  }
};

// Translate text using Azure Translation API
const translateText = async (text, targetLanguage) => {
  try {
    const translationResponse = await axios.post(
      'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0',
      [
        {
          text: text,
        },
      ],
      {
        params: {
          to: targetLanguage,
        },
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': translationApiKey,
        },
      }
    );

    console.log('Translation response:', translationResponse.data);

    return translationResponse.data[0].translations[0].text;
  } catch (error) {
    console.error('Error translating text:', error.message);
    return text;
  }
};

bot.hears(/^set language (.+)$/i, async (ctx) => {
  // Extract the target language from the user's message
  const targetLanguageName = ctx.match[1];

  // Fetch supported languages if not fetched yet
  if (Object.keys(languageMapping).length === 0) {
    await fetchSupportedLanguages();
  }

  // Get the language code from the full language name
  const targetLanguage = getLanguageCode(targetLanguageName);

  // Translate the response message into the user's preferred language
  const translatedResponse = await translateText('No problem!', targetLanguage);

  // Store the user's preferred language in memory
  userSettings[ctx.message.from.id] = targetLanguage;

  // Respond to the user in their preferred language
  ctx.reply(translatedResponse);
});

bot.hears(/^\d+$/, async (ctx) => {
  // Check if the user has set a language preference
  const userId = ctx.message.from.id;
  const targetLanguage = userSettings[userId];

  // Fetch Chuck Norris jokes
  const jokes = await scrapeChuckNorrisJokes();

  // Get the index provided by the user
  const index = parseInt(ctx.message.text);
  console.log("number of a joke: ", index)
  console.log("the jokes:", jokes)
  // Check if the index is valid
  //if () {
  //  ctx.reply('did not got accecss to jokes');
  //  return;
  // }

  if (isNaN(index) || index < 1 || index > jokes.length) {
    ctx.reply('Please provide a valid index between 1 and 101.');
    return;
  }

  // Get the selected joke
  const selectedJoke = jokes[index - 1];

  // Translate the joke using the Azure Translation API
  const translatedJoke = await translateText(selectedJoke, targetLanguage);

  // Reply to the user with the translated joke
  ctx.reply(translatedJoke);
});

// Start the bot
bot.launch();

// Starting message
console.log('ChuckNorris Bot is now active!');