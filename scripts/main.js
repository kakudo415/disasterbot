'use strict';
let Fs = require('fs');
let Log = require('log');
let FeedParser = require('feedparser');
let logger = new Log('debug', Fs.createWriteStream('./access_log', {flags: 'a'}));
let feedparser = new FeedParser({});

module.exports = (robot) => {
  robot.hear(/!alertbot/, (msg) => {
    msg.send('私は気象庁から警報などの情報を取得し、お伝えします');
  });

  robot.router.get('/sub', (req, res) => {
    const query = req.query;
    if (query['hub.mode'] !== 'subscribe' && query['hub.mode'] !== 'unsubscribe') {
      res.status(404).send('MODE ERROR').end();
      logger.error(JSON.stringify(query));
      return;
    }
    if (query['hub.verify_token'] !== process.env.JMA_VERIFY_TOKEN) {
      res.status(404).send('VERIFY_TOKEN ERROR').end();
      logger.error(JSON.stringify(query));
      return;
    }
    res.status(200).send(query['hub.challenge']).end();
    logger.info(JSON.stringify(query));
  });

  robot.router.post('/sub', (req, res) => {
    robot.send({room: '災害情報'}, JSON.stringify(req.body));
    res.status(200).end();
    logger.info(req.body);
  });
};