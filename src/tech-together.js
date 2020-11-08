/*

tech-together.js

A Slack bot that builds community by monitoring and encouraging participation.
Built by Elizabeth Carney and Vicky Zhang for TechTogether 2020.

*/

/* setup */
const { Botkit, BotkitConversation } = require('botkit')
const { SlackAdapter, SlackEventMiddleware } = require(
  'botbuilder-adapter-slack')
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')

/**
 * Returns the secret string from Google Cloud Secret Manager
 * @param {string} name The name of the secret.
 * @return {string} The string value of the secret.
 */
async function accessSecretVersion(name) {
  const client = new SecretManagerServiceClient()
  const projectId = process.env.PROJECT_ID
  const [version] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/${name}/versions/1`
  })

  // Extract the payload as a string.
  const payload = version.payload.data.toString('utf8')

  return payload
}

/* emojis defined as positive in feeling */
var posrxns = ["heart", "orange_heart", "yellow_heart", "green_heart", "blue_heart",
"purple_heart", "black_heart", "heavy_heart_exclamation_mark_ornament", "heartpulse",
"sparkling_heart", "two_hearts", "heartbeat", "grinning", "grin", "smiley", "joy",
"rolling_on_the_floor_laughing", "smile", "laughing", "blush", "sunglasses",
"heart_eyes", "kissing_heart", "relaxed", "slightly_smiling_face", "star-struck", "hugging_face"];

/* maximum number of messages/reactions that can be configured as the goal */
var max_num = 500;

/* goal counts for messages and reactions */
var goal_msgs = 0;
var goal_rxns = 0;
var goal_posrxns = 0;

/* counts for tracking messages and reactions */
var num_msgs = 0;
var num_rxns = 0;
var num_posrxns = 0;

/* setters and getters for goal numbers */
var setGoalMsgs = (goal_msg_input) => {
    goal_msgs = goal_msg_input;
}
var setGoalRxns = (goal_rxn_input) => {
    goal_rxns = goal_rxn_input;
}
var getGoalRxns = () =>  goal_rxns;
var setGoalPosrxns = (goal_posrxn_input) => {
    goal_posrxns = goal_posrxn_input;
}

/* message payloads */ 
/* reminder payload, if quiet */
var create_prompt_payload = () => {
    return {
        "blocks": [
            {
            "type": "section",
            "text": {
                "type": "plain_text",
                "text": ":eyes: It’s kind of quiet here… How is everyone’s week going?",
                "emoji": true
            }
            }
        ]
    }
}

/* weekly question payload */
var create_question_payload = () => {
    return {
        "blocks": [
            {
            "type": "section",
            "text": {
                "type": "plain_text",
                "text": ":yellow_heart: Hey friends, Happy Monday!! \n:eyes: Our question of the week is: If you could wake up tomorrow having gained any one quality or ability, what would it be? \n :revolving_hearts: React and respond to each other's answers to reach our weekly goal!",
                "emoji": true
            }
            }
        ]
    }
}

/* congrats payload if goal achieved */
var create_congrats_payload = () => {
    return {
        "blocks": [
            {
            "type": "section",
            "block_id": "section567",
            "text": {
                "type": "mrkdwn",
                "text": ":star2:*Congratulations!!!*:star2:\nYour team did a fantastic job building community this week.\nWe sent " + num_msgs + " :email: messages and reacted to each other " + num_rxns + " times, including " + num_posrxns + " :blush: positive emotions! :heart:\n*You rock!*:sparkles::heavy_heart_exclamation_mark_ornament::tada::guitar:"
            },
            "accessory": {
                "type": "image",
                "image_url": "https://memegenerator.net/img/instances/67790035/i-think-this-calls-for-a-celebration.jpg",
                "alt_text": "I think this calls for a celebration!"
            }
            }
        ]
    }
}

/* fail payload if goal not achieved */
var create_fail_payload = () => {
    return {
        "blocks": [
            {
            "type": "section",
            "text": {
                "type": "plain_text",
                "text": ":confused: We didn't reach our goal this week. Let's try harder next week!\nWe sent " + num_msgs + " :email: messages and reacted to each other " + num_rxns + " times, including " + num_posrxns + " :blush: positive emotions! :heart:\n",
                "emoji": true
            }
            }
        ]
    }
}

/* configuration dailogue */
function createConfigDialog(controller) {
    let convo = new BotkitConversation('config-goals', controller);
    convo.ask("Would you like to change your team's fAMIEly goals?", [
        {
            pattern: 'yes',
            handler: async(response, convo, bot) => {
                await convo.gotoThread('config_msgs');
            }
        },
        {
            pattern: 'no',
            handler: async(response, convo, bot) => {
                await convo.gotoThread('no_config');
            }
        },
        {
            default: true,
            handler: async(response, convo, bot) => {
                await convo.gotoThread('default');
            }
        },
    ]);

    // CONFIG_MSGS
    convo.addQuestion('How many messages should the group send in total this week?', [
        {
            pattern: '^[0-9]+?', 
            handler: async(response, convo, bot, message) => {
                let goal_msg_input = parseInt(response);
                if(goal_msg_input > max_num){
                    await convo.gotoThread('too_many_msgs');
                }
                else {
                    setGoalMsgs(goal_msg_input);
                    console.log('new goal: '+goal_msg_input+' msgs');
                    await convo.gotoThread('config_rxns');
                }
            }
        },
        { default: true,
            handler: async(response, convo, bot, message) => {
                if (response){ 
                    await convo.gotoThread('ask_again_msgs');
                }
            }
        }
    ], 'goal_msg_input', 'config_msgs');

    // CONFIG_RXNS
    convo.addQuestion('How many reactions should the group send in total this week?', [
        {
            pattern: '^[0-9]+?', 
            handler: async(response, convo, bot, message) => {
                let goal_rxn_input = parseInt(response);
                if(goal_rxn_input > max_num){
                    await convo.gotoThread('too_many_rxns');
                }
                else {
                    setGoalRxns(goal_rxn_input);
                    console.log('new goal: '+goal_rxn_input+' rxns');
                    await convo.gotoThread('config_posrxns');
                }
            }
        },
        { default: true,
            handler: async(response, convo, bot, message) => {
                if (response){ 
                    await convo.gotoThread('ask_again_rxns');
                }
            }
        }
    ], 'goal_rxn_input', 'config_rxns');

    // CONFIG_POSRXNS
    convo.addQuestion('How many of those reactions should be positive in emotion?', [
        {
            pattern: '^[0-9]+?', 
            handler: async(response, convo, bot, message) => {
                let goal_posrxn_input = parseInt(response);
                let goal_rxns = getGoalRxns();
                if(goal_posrxn_input > goal_rxns){
                    await convo.gotoThread('too_many_posrxns');
                }
                else {
                    setGoalPosrxns(goal_posrxn_input);
                    console.log('new goal: '+goal_posrxn_input+' posrxns');
                    await convo.gotoThread('saved_changes');
                }
            }
        },
        { default: true,
            handler: async(response, convo, bot, message) => {
                if (response){ 
                    await convo.gotoThread('ask_again_posrxns');
                }
            }
        }
    ], 'goal_posrxn_input', 'config_posrxns');

    // TOO_MANY_MSGS: if requested number of messages is too large, jump to start of config_msgs
    convo.addMessage('Sorry, that\'s more than we can handle. Please enter a number between 0 and 500.', 
    'too_many_msgs');
    convo.addAction('config_msgs', 'too_many_msgs');
    // ASK_AGAIN_MSGS: if input not a number
    convo.addMessage('Sorry, I didn\'t understand that', 
    'ask_again_msgs');
    convo.addAction('config_msgs', 'ask_again_msgs');

    // TOO_MANY_RXNS: if requested number of reactions is too large, jump to start of config_rxns
    convo.addMessage('Sorry, that\'s more than we can handle. Please enter a number between 0 and 500.', 
    'too_many_rxns');
    convo.addAction('config_rxns', 'too_many_rxns');
    // ASK_AGAIN_RXNS: if input not a number
    convo.addMessage('Sorry, I didn\'t understand that', 
    'ask_again_rxns');
    convo.addAction('config_rxns', 'ask_again_rxns');

    // TOO_MANY_POSRXNS: if requested number of positive reactions is too large, jump to start of config_posrxns
    convo.addMessage('Sorry, that\'s more than your total reactions goal. Please enter a number between 0 and {{vars.goal_rxn_input}}.', 
    'too_many_posrxns');
    convo.addAction('config_posrxns', 'too_many_posrxns');
    // ASK_AGAIN_POSRXNS: if input not a number
    convo.addMessage('Sorry, I didn\'t understand that', 
    'ask_again_posrxns');
    convo.addAction('config_posrxns', 'ask_again_posrxns');

    // NO_CONFIG: if user responds "no" to "Would you like to change your team's fAMIEly goals?"
    convo.addMessage('Ok, hope you have a great week!', 'no_config');

    // SAVED_CHANGES: at end of conversation, repeat new settings back to user
    convo.addMessage('Awesome! Your new goals have been saved. Your team aims to send {{vars.goal_msg_input}} messages and {{vars.goal_rxn_input}} reactions this week, including {{vars.goal_posrxn_input}} with positive vibes.', 'saved_changes');

    return (convo);
}


/*
 * Initialize the bot
 */
async function botInit() {
  const adapter = new SlackAdapter({
    clientSigningSecret: await accessSecretVersion('client-signing-secret'),
    botToken: await accessSecretVersion('bot-token')
  })

  adapter.use(new SlackEventMiddleware())

  const controller = new Botkit({
    webhook_uri: '/api/messages',
    adapter: adapter
  })

  convo = createConfigDialog(controller);
  controller.addDialog(convo);

  controller.ready(() => {

    // when someone adds a reaction, inc rxns and maybe posrxns
    controller.on('reaction_added', async (bot, message) => {
      console.log("I saw a reaction!");
      num_rxns += 1;
      if (posrxns.includes(message.reaction)) {
        console.log("and it was a <3");
        num_posrxns += 1;
      }
      console.log(num_rxns+", pos: "+num_posrxns);
      return;
    });

    // when someone sends a message, inc msgs
    controller.on('message', async (bot, message) => {
      console.log("I saw a message!");
      num_msgs += 1;
      console.log(num_msgs);
      return;
    });

    // when someone dms with the word "configure", start configuration dialogue
    controller.hears(['config','configure'], ['message', 'direct_message'],
      async (bot, message) => {
        // Don't respond to self
        if (message.bot_id != message.user){
          await bot.startConversationInChannel(message.channel, message.user);
          return await bot.beginDialog('config-goals');
        }
    }); 


    /* FORCE ALL MESSAGES TO SEND FOR TESTING */
    // when someone sends a message saying "goal was achieved", send congrats message
    controller.hears('goal was achieved', 'message', async (bot, message) => {
      console.log("Sending congrats");
      let congrats_content = create_congrats_payload();
      await bot.reply(message, congrats_content);
      return;
    });
    // when someone sends a message saying "goal wasn't achieved", send try again message
    controller.hears('goal not achieved', 'message', async (bot, message) => {
      console.log("Sending try again");
      let fail_content = create_fail_payload();
      await bot.reply(message, fail_content);
      return;
    });
    // when someone sends a message saying "reminder", send prompt message
    controller.hears('reminder', 'message', async (bot, message) => {
      console.log("Sending prompt");
      let prompt_content = create_prompt_payload();
      await bot.reply(message, prompt_content);
      return;
    });
    // when someone sends a message saying "question", send weekly question message
    controller.hears('question', 'message', async (bot, message) => {
      console.log("Sending question");
      let question_content = create_question_payload();
      await bot.reply(message, question_content);
      return;
    });


  })
}

botInit()