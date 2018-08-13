'use strict';

const verifyToken = process.env.JMA_VERIFY_TOKEN;

module.exports = (robot) => {
  robot.router.get('/sub', (req, res) => {
    const query = req.query;
    if (query['hub.mode'] !== 'subscribe') {
      res.status(404).send('MODE ERROR').end();
      return;
    }
    if (query['hub.verify_token'] !== verifyToken) {
      res.status(404).send('VERIFY_TOKEN ERROR').end();
      return;
    }
    res.status(200).send(query['hub.challenge']).end();
  });
};