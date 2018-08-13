'use strict';
let fs = require('fs');
let log = require('log');
let logger = new log('debug', fs.createWriteStream('./access_log', 'utf8'));

const verifyToken = process.env.JMA_VERIFY_TOKEN;

module.exports = (robot) => {
  robot.router.get('/sub', (req, res) => {
    const query = req.query;
    if (query['hub.mode'] !== 'subscribe') {
      res.status(404).send('MODE ERROR').end();
      logger.error(query);
      return;
    }
    if (query['hub.verify_token'] !== verifyToken) {
      res.status(404).send('VERIFY_TOKEN ERROR').end();
      logger.error(query);
      return;
    }
    res.status(200).send(query['hub.challenge']).end();
    logger.info(query);
  });
};