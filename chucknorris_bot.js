const { Telegraf } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');

// Telegram token
const bot = new Telegraf('6865982965:AAFG9O2QH5oVvD9D-NzaeYEIprGzKsqloRM');

// Store user settings (language) in memory
const userSettings = {};

// Set default language to English
const defaultLanguage = 'en';
userSettings.defaultLanguage = defaultLanguage;

// Azure Translation API key
const translationApiKey = 'fb89e91d643942e498f67e3bd1daba87';

// Azure Translation API endpoint
const translationApiEndpoint = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';


// Language mapping object (populated dynamically)
let languageMapping = {};

// Define a placeholder for text that should not be translated
const NO_TRANSLATE_PLACEHOLDER = '__NO_TRANSLATE__';

// Function to fetch supported languages from Azure Translation API
const fetchSupportedLanguages = async () => {
  try {
    const response = await axios.get('https://api.cognitive.microsofttranslator.com/languages?api-version=3.0', {
      headers: {
        'Ocp-Apim-Subscription-Key': translationApiKey,
      },
    });

    const supportedLanguages = Object.keys(response.data.translation);
    languageMapping = supportedLanguages.reduce((map, language) => {
      map[response.data.translation[language].name.toLowerCase()] = language;
      return map;
    }, {});
  } catch (error) {
    ctx.reply('Sorry, there was a problem getting the language options. Please try again.');
    console.error('Error fetching supported languages:', error.message);
  }
};

// Function to get language code from full language name
const getLanguageCode = (languageName) => {
  return languageMapping[languageName.toLowerCase()] || languageName;
};

// Function for getting list of Chuck Norris joke
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

    const jokes = [];
    $('ol li').each((index, element) => {
      jokes.push($(element).text().trim());
    });

    return jokes;
  } catch (error) {
    const errormessage = 'Sorry, there was a problem getting your Chuck Norris jokes. Please try again.';
    const translatederrormessage = await translateText(errormessage, targetLanguage);
    ctx.reply(translatederrormessage);
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
    return translationResponse.data[0].translations[0].text;
  } catch (error) {
    ctx.reply('Sorry, there was a problem the translation. Please ensure your language setting is configured correctly.');
    console.error('Error translating text:', error.message);
    return text;
  }
};

// Function to handle the user request to set language
bot.hears(/^set language (.+)$/i, async (ctx) => {
  const targetLanguageName = ctx.match[1];

  if (Object.keys(languageMapping).length === 0) {
    await fetchSupportedLanguages();
  }

  const targetLanguage = getLanguageCode(targetLanguageName);

  const translatedResponse = await translateText('No problem!', targetLanguage);

  userSettings[ctx.message.from.id] = targetLanguage;

  ctx.reply(translatedResponse);
});

// Function to handle the user request for a joke
bot.hears(/^\d+$/, async (ctx) => {
  const userId = ctx.message.from.id;
  const targetLanguage = userSettings[userId];

  const jokes = await scrapeChuckNorrisJokes();

  const index = parseInt(ctx.message.text);

  if (jokes.length === 0) {
    const errormessage = 'Sorry, we encountered an issue while trying to find your requested joke. Please try again, ensuring that your number is between 1 and 101.'
    const translatederrormessage = await translateText(errormessage, targetLanguage);
    ctx.reply(translatederrormessage);
    return;
  }

  if (isNaN(index) || index < 1 || index > jokes.length) {
    const errormessage = 'Please provide a valid index between 1 and 101.';
    const translatederrormessage = await translateText(errormessage, targetLanguage);
    ctx.reply(translatederrormessage);
    return;
  }

  const selectedJoke = jokes[index - 1];

  const translatedJoke = await translateText(selectedJoke, targetLanguage);

  const jokeWithNumber = `${index}. ${translatedJoke}`;
  ctx.reply(jokeWithNumber);
});

// Function to handle the "/start" command
bot.start(async (ctx) => {
  const userId = ctx.message.from.id;
  const targetLanguage = userSettings[userId] || userSettings.defaultLanguage || 'en';

  const startMessage = `
  Welcome to the Chuck Norris Jokes Bot!

  This bot will provide you with 101 Chuck Norris jokes in your preferred language!
  To get your laughs, this bot can do the following:

  - Set your preferred language using the command
   "${NO_TRANSLATE_PLACEHOLDER}set ${NO_TRANSLATE_PLACEHOLDER}language ${NO_TRANSLATE_PLACEHOLDER}<language>"
  - Retrieve Chuck Norris jokes by providing a number (e.g., 5"), number must be between 1 and 101
  - Use command "/help" to get a list of available actions
  - Use command "/start" to see this message again

  Example usage:
  - Set language to hebrew:
   "${NO_TRANSLATE_PLACEHOLDER}set ${NO_TRANSLATE_PLACEHOLDER}language ${NO_TRANSLATE_PLACEHOLDER}hebrew"
  - Get Chuck Norris joke #5 in Hebrew: 5

  Enjoy the jokes!
  `;

  const translatedIntroMessage = await translateText(startMessage, targetLanguage);

  const finalIntroMessage = translatedIntroMessage.replace(new RegExp(NO_TRANSLATE_PLACEHOLDER, 'g'), '');

  ctx.reply(finalIntroMessage);
});

// Function to handle the "/help" command
bot.help(async (ctx) => {
  const userId = ctx.message.from.id;
  const targetLanguage = userSettings[userId] || userSettings.defaultLanguage || 'en';

  const helpMessage = `
  This bot can do the following:
  - Set your preferred language using the command
  "${NO_TRANSLATE_PLACEHOLDER}set ${NO_TRANSLATE_PLACEHOLDER}language ${NO_TRANSLATE_PLACEHOLDER}<language>"
  - Retrieve Chuck Norris jokes by providing a number (e.g., "5"), number must be between 1 and 101

  Example usage:
  - Set language to Hebrew:
   "${NO_TRANSLATE_PLACEHOLDER}set ${NO_TRANSLATE_PLACEHOLDER}language ${NO_TRANSLATE_PLACEHOLDER}hebrew"
  - Get Chuck Norris joke #5 in Hebrew: 5
  `;

  const translatedHelpMessage = await translateText(helpMessage, targetLanguage);

  const finalHelpMessage = translatedHelpMessage.replace(new RegExp(NO_TRANSLATE_PLACEHOLDER, 'g'), '');

  ctx.reply(finalHelpMessage);
});

//Function to handle invalid commands and texts
bot.on('text', async (ctx) => {
  const userId = ctx.message.from.id;
  const targetLanguage = userSettings[userId] || userSettings.defaultLanguage || 'en';

  const errorMessage = 'Sorry, I didn\'t understand that command. Please use a valid command or type "/help" for assistance.';
  const translatedErrorMessage = await translateText(errorMessage, targetLanguage);

  ctx.reply(translatedErrorMessage);
});

// Start the bot
bot.launch();