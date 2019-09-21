const Alexa = require('ask-sdk-core');

const filmData  = require('./filmData');

const questionPauseSound = '<audio src="soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_bridge_02"/>';
const break1SSound = "<break time='1s'/>";
const endGameSound = '<audio src="soundbank://soundlibrary/gameshow/gameshow_01"/>';
const badGuessSound = '<audio src="soundbank://soundlibrary/gameshow/gameshow_03"/>';

const WELCOME_MSG = "Hola, esto es Cine Manía. ¿Serás capaz de adivinar todas las películas? ¡Comencemos! ";
const REPROMPT_MSG = "Parece que te he dejado sin palabras. ";
const GOOD_GUESS_MSG = "¡Acertaste la película! ";
const NEXT_MOVIE_MSG = "¡Vamos con la siguiente! ";
const GOOD_END_GAME_MSG = "¡Enhorabuena Paco! ¡Has completado el juego! ";
const BAD_END_GAME_MSG = "No has acertado la película. "
const BAD_GUESS_MSG = "No es correcto. ";
const TRY_AGAIN_MSG = "Inténtalo de nuevo. "
const GAME_OVER = "Se acabó el juego. "
const NEW_HINT_MSG = "Venga, que te doy otra pista. "
const TOO_MANY_HINTS = "No quedan más pistas para adivinar la película. "
const BYE_MSG = "Espero que te hayas divertido, inténtalo de nuevo. "
const EXTRA_HINT_MSG = "De acuerdo, te voy a dar un par de pistas extra. "
const EXTRA_HINT_USED_MSG = "Ya te he dado una pista extra, no puedo darte otra, tic tac tic tac... "
const FILM_TITLE_MSG = "¿Cuál es el título de la película?"
const MSG_EQUILICUA = ["<say-as interpret-as='interjection'>equilicuá.</say-as> ","<say-as interpret-as='interjection'>ajá.</say-as> ","<say-as interpret-as='interjection'>bien bien.</say-as> ","<say-as interpret-as='interjection'>bingo.</say-as> ","<say-as interpret-as='interjection'>bravo.</say-as> "]


const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        
        // Set new game
        resetGame(handlerInput);
        
        // Get new movie to guess
        var hint = getHint(getNextFilm(handlerInput));
        
        // Build movie guess message to start game
        var alexamessage = "  La pista es: " + hint + break1SSound + " ¿Qué película es?"
        var speakOut = WELCOME_MSG + questionPauseSound + alexamessage;
        var speakRepromt = REPROMPT_MSG + questionPauseSound + alexamessage;
    
        return handlerInput.responseBuilder
            .speak(speakOut)
            .withSimpleCard("cinemania", speakOut)
            .reprompt(speakRepromt)
            .getResponse();
    }
};

const extraHintIntent = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'extraHintIntent';
    },
    handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        const movieToGuess = sessionAttributes["film"];
        
        var speakOut = "";
        var speakRepromt = "";

        if (!sessionAttributes["extraHint"]) {
            // Give user extra hint
            var hint = getExtraHint(movieToGuess);
            
            speakOut = EXTRA_HINT_MSG + break1SSound + hint + break1SSound + FILM_TITLE_MSG;
            speakRepromt = hint + break1SSound + FILM_TITLE_MSG;
            
            sessionAttributes["extraHint"] = true;
        } else {
            // User has already used extra hint for this movie
            speakOut = EXTRA_HINT_USED_MSG + break1SSound + FILM_TITLE_MSG;
            speakRepromt = EXTRA_HINT_USED_MSG + FILM_TITLE_MSG;
        }
        
        return handlerInput.responseBuilder
            .speak(speakOut)
            //.withSimpleCard("cinemania", speakOut)
            .reprompt(speakRepromt)
            .getResponse();
    }
};

const solveMovieIntent = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'solveMovieIntent';
    },
    handle(handlerInput) {
        
        const intent = handlerInput.requestEnvelope.request.intent;
        const userMovieGuess = intent.slots.movieName.value;
        
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        const movieToGuess = sessionAttributes["film"];
        var speakOut = "";
        var speakRepromt = "";
        var hint = "";
        var isGameOver = false;
        
        if (movieToGuess.movie.title.toLowerCase() === userMovieGuess.toLowerCase()) {
            
            // Right guess, player score +1
            sessionAttributes["score"] += 1;
            attributesManager.setSessionAttributes(sessionAttributes);

            var userScore = "Tu número de aciertos fué: " + sessionAttributes["score"];
            
            if(sessionAttributes["score"] >= 3){
                // User finished game
                speakOut = endGameSound + GOOD_END_GAME_MSG + "<say-as interpret-as='interjection'>crack</say-as>" +  BYE_MSG + "<say-as interpret-as='interjection'>hasta luego</say-as>" ;
                speakRepromt = REPROMPT_MSG + GOOD_END_GAME_MSG + "<say-as interpret-as='interjection'>crack</say-as>";
                
                // End game session
                isGameOver = true;
                
            } else {
                // Continue playing, build success messages and get new movie to guess
                hint = getHint(getNextFilm(handlerInput));
                
                var bien = randomPhrase(MSG_EQUILICUA)
        
                speakOut =  bien + " " + GOOD_GUESS_MSG + userScore + " " + break1SSound + NEXT_MOVIE_MSG + questionPauseSound + hint;
                speakRepromt = REPROMPT_MSG + NEXT_MOVIE_MSG + questionPauseSound;
            }
        } else {
            // Bad guess
            sessionAttributes["filmGuessingAttempts"] += 1;
            attributesManager.setSessionAttributes(sessionAttributes);
            
            if (sessionAttributes["filmGuessingAttempts"] >=3) {
                // Game over
                speakOut = badGuessSound + TOO_MANY_HINTS + break1SSound + BAD_END_GAME_MSG + break1SSound + BYE_MSG + "<say-as interpret-as='interjection'>hasta luego</say-as>";
                speakRepromt = REPROMPT_MSG + BAD_END_GAME_MSG + BYE_MSG;
                
                // End game session
                isGameOver = true;
                
            } else {
                // Give next hint
                // TODO: check next hint is different to previous ones from same movie
                hint = getHint(movieToGuess);
                speakOut = badGuessSound + BAD_GUESS_MSG + break1SSound + TRY_AGAIN_MSG + " . ¡Ánimo!" + NEW_HINT_MSG + questionPauseSound + hint;
            }
        }
    
        return handlerInput.responseBuilder
            .speak(speakOut)
            //.withSimpleCard("cinemania", speakOut)
            .reprompt(speakRepromt)
            .withShouldEndSession(isGameOver)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        var speakOutput = "Las reglas del juego son sencillas. Te iré dando pistas y debes tratar de adivinar el título del mayor número posible de películas con ellas. "
        speakOutput += " Si quieres puedes pedirme hasta una pista extra por cada película. ";
        speakOutput += " En cualquier momento puedes finalizar el juego diciendo 'Me rindo' ."; 
        speakOutput += " ¡Mucha suerte!"; 

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        // User ends game
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        const movieToGuess = sessionAttributes["film"];
        const userScore = sessionAttributes["score"];
        const titleToGuess = "¡Qué pena! Era fácil. la película era: " + movieToGuess.movie.title + ". ";
        const scoreMessage = "Tu número de aciertos ha sido: " + userScore + ". ";
        
        const speakOut = titleToGuess + break1SSound + scoreMessage + BYE_MSG + break1SSound + "<say-as interpret-as='interjection'>hasta luego</say-as>";
        
        return handlerInput.responseBuilder
            .speak(speakOut)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `Acabas de lanzar ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Lo siento, ha habido un problema gestionando la petición. Por favor, inténtalo de nuevo.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

//TODO take this helper functions to another file ///////////////////////////
function resetGame(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const sessionAttributes = attributesManager.getSessionAttributes();
    
    sessionAttributes["film"] = "";
    sessionAttributes["score"] = 0;
    sessionAttributes["filmGuessingAttempts"] = 0;
    sessionAttributes["extraHint"] = false;
    
    attributesManager.setSessionAttributes(sessionAttributes);
    
}

//TODO take this helper functions to another file ///////////////////////////
function getNextFilm(handlerInput) {
    if(filmData.movies.length === 0) return null;
    const nextFilm = filmData.movies[Math.floor(Math.random() * filmData.movies.length)];
    
    // Save movie to session attributes
    const attributesManager = handlerInput.attributesManager;
    const sessionAttributes = attributesManager.getSessionAttributes();
    sessionAttributes["film"] = nextFilm;
    sessionAttributes["filmGuessingAttempts"] = 0;
    sessionAttributes["extraHint"] = false;
    attributesManager.setSessionAttributes(sessionAttributes);

    return nextFilm;
}

//TODO take this helper functions to another file ///////////////////////////
function getHint(movie) {
    const actualMovie = movie.movie;
    if(actualMovie.hints.length === 0) return null;
    const hint = actualMovie.hints[Math.floor(Math.random() * actualMovie.hints.length)];

    return hint;
    
}

//TODO take this helper functions to another file ///////////////////////////
function getExtraHint(movie) {
    const actualMovie = movie.movie;
    let answerString = "Lo siento, me he ausentado un momento a por un cafe, en esta película no puedo darte una pista extra.";
    if(actualMovie.director && actualMovie.year){
        answerString = "<say-as interpret-as='interjection'>mmh.</say-as> El director de la pelicula es: " 
        + actualMovie.director + 
        " y el año en que se estrenó fue en " 
        + actualMovie.year;
    }

    return (answerString);
}

function randomPhrase(array) {
  return (array[Math.floor(Math.random() * array.length)]);
}

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        extraHintIntent,
        solveMovieIntent,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .lambda();
