'use strict';
let fs = require('fs');
let log = require('log');
let feedparser = require('feedparser');
let logger = new log('debug', fs.createWriteStream('./access_log', {flags: 'a'}));
let fp = new feedparser();

const verifyToken = process.env.JMA_VERIFY_TOKEN;

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
    if (query['hub.verify_token'] !== verifyToken) {
      res.status(404).send('VERIFY_TOKEN ERROR').end();
      logger.error(JSON.stringify(query));
      return;
    }
    res.status(200).send(query['hub.challenge']).end();
    logger.info(JSON.stringify(query));
  });

  robot.router.post('/sub', (req, res) => {
    let feed;
    req.on('response', () => {
      req.pipe(fp);
    });
    fp.on('readable', () => {
      let buffer;
      while (buffer = this.read()) {
        feed += buffer;
      }
    });
    fp.on('end', () => {
      robot.send({room: '災害情報'}, feed);
      logger.info(feed);
    });
    res.status(200).end();
  });
};