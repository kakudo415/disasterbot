'use strict';
const request = require('request');

const alreadyRead = new Array;

const trace = (obj, ...name) => {
  const target = String(name.shift());
  if (obj.children) {
    for (let i = 0; i < obj.children.length; i++) {
      if (obj.children[i].name === target) {
        if (name.length >= 1) {
          return trace(obj.children[i], name);
        }
        return obj.children[i].value;
      }
    }
  }
  return null;
};

const assembleMessage = (info) => {
  return trace(info, 'Control', 'Title');
};

module.exports = (bot) => {
  // Polling Kishow API
  setInterval(() => {
    request.get('https://kakudo.app/kishow/3min.json', (err, res, body) => {
      try {
        if (err || res.statusCode !== 200) {
          return;
        }
        const json = JSON.parse(body);
        for (let key in json.body) {
          if (alreadyRead.includes(key)) {
            continue;
          } else {
            alreadyRead.push(key);
          }
          bot.send({
            room: '開発'
          }, assembleMessage(json.body[key]));
        }
      } catch (err) {
        console.error(err);
      }
    });
  }, 1000);
};