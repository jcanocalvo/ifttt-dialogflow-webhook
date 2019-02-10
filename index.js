const configController = require('./libs/config');
const auth = require('./libs/auth');

const request =         require('request');
const express =         require('express');
const bodyParser =      require('body-parser');
const { dialogflow } =  require('actions-on-google');

const expressApp = express().use(bodyParser.json());
expressApp.use(auth);

require('./libs/config.hooks')(expressApp);

const app = dialogflow();

const init = config => {
    for (intent in config.intents) {
        const event = config.intents[intent];

        app.intent(intent, conv => {
            console.info(intent + ' received. I will fire ' + event + ' event.');

            const queryResult = conv.body.queryResult;
            const formData = queryResult.parameters;
            const postBody = {
                url: config.trigger_url.replace('{event}', event),
                form: formData
            };

            return new Promise((resolve, reject) => {
                request.post(postBody, function(err, response, body) {
                    if (err) {
                        console.error(err);
                        conv.ask('Error!');
                        resolve();
                        return;
                    }

                    conv.ask(queryResult.fulfillmentText);
                    resolve();
                });
            });
        })
    };
}

init(configController.getConfig());
configController.events.on('config-updated', () => {
    init(configController.getConfig());
});

expressApp.post('/fulfillment', app);
expressApp.use(express.static('static'));
 
expressApp.listen(process.env.PORT || 3000);