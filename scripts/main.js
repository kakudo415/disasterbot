'use strict';
const request = require('request');

const alreadyRead = [];

module.exports = (bot) => {
  setInterval(() => {
    request.get("https://kakudo.app/kishow/", poll);
  }, 1000);

  const poll = (err, res, body) => {
    if (err || res.statusCode !== 200) {
      return;
    }
    try {
      const data = JSON.parse(body);
      for (let uuid of data.UUID) {
        if (!alreadyRead.includes(uuid)) {
          request.get(`https://kakudo.app/kishow/${uuid}`, info);
          alreadyRead.push(uuid);
        }
      }
    } catch (e) {
      console.error(e);
      return;
    }
  };

  const info = (err, res, body) => {
    if (err || res.statusCode !== 200) {
      return;
    }
    try {
      const data = JSON.parse(body);
      bot.send({ room: "開発" }, asmMsg(data.Report));
    } catch (e) {
      console.error(e);
      return;
    }
  };

  const asmMsg = (info) => {
    const attachments = [];
    switch (info.Head.InfoKind) {
      default:
        const headline = info.Head.Headline.Text;
        attachments.push({
          text: `${headline ? headline : info.Head.InfoKind}`,
          color: '#2196F3'
        });
    }
    return {
      attachments
    };
  };
};