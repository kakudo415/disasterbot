'use strict';
const request = require('request');

const alreadyRead = new Array;

// JSONを探索して指定されたパス(可変長引数)の値を配列(同名のパスが複数存在可)で返す
const trace = (obj, ...name) => {
  let values = [];
  const target = name.shift();
  if (obj.children) {
    for (let i = 0; i < obj.children.length; i++) {
      if (obj.children[i].name === target) {
        if (name.length >= 1) {
          values = values.concat(trace(obj.children[i], ...name));
        }
        if (obj.children[i].value.length > 0) {
          values = values.concat(obj.children[i].value);
        }
      }
    }
  }
  return values;
};

// Slack attachment形式のメッセージを組み立てる
const asmMsg = (info) => {
  const attachments = [];
  switch (trace(info, 'Head', 'InfoKind')) {
    default:
      const headline = trace(info, 'Head', 'Headline', 'Text')[0];
      attachments.push({
        text: `${headline?headline:trace(info, 'Head', 'InfoKind')}`,
        color: '#2196F3'
      });
  }
  return {
    attachments
  };
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
          }, asmMsg(json.body[key]));
        }
      } catch (err) {
        console.error(err);
      }
    });
  }, 1000);
};