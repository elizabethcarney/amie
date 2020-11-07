/*

tech-together.js

A Slack bot that builds community by monitoring and encouraging participation.
Built by Elizabeth Carney and Vicky Zhang for TechTogether 2020.

*/

const { Botkit } = require('botkit')
const { SlackAdapter, SlackEventMiddleware } = require(
  'botbuilder-adapter-slack')
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')

/**
 * Returns the secret string from Google Cloud Secret Manager
 * @param {string} name The name of the secret.
 * @return {string} The string value of the secret.
 */
async function accessSecretVersion (name) {
  const client = new SecretManagerServiceClient()
  const projectId = process.env.PROJECT_ID
  const [version] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/${name}/versions/1`
  })

  // Extract the payload as a string.
  const payload = version.payload.data.toString('utf8')

  return payload
}

/*
 * Initialize the bot
 */
async function botInit () {
  const adapter = new SlackAdapter({
    clientSigningSecret: await accessSecretVersion('client-signing-secret'),
    botToken: await accessSecretVersion('bot-token')
  })

  adapter.use(new SlackEventMiddleware())

  const controller = new Botkit({
    webhook_uri: '/api/messages',
    adapter: adapter
  })

  controller.ready(() => {
    controller.hears(['hello', 'hi'], ['message', 'direct_message'],
      async (bot, message) => {
        await bot.reply(message, 'hey there')
      })
  })
}

botInit()