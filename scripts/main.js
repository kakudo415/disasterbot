"use strict";
const request = require("request");
const message = require("./message.js");

module.exports = (bot) => {
  bot.respond("", (msg) => {
    msg.send("こんにちは！私は気象庁から得た災害に関する情報を #災害情報 に投稿します");
  });

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
        if (bot.brain.get(`ALERTBOT:${uuid}`)) {
          continue;
        }
        request.get(`https://kakudo.app/kishow/${uuid}`, info);
        bot.brain.set(`ALERTBOT:${uuid}`, "MOUMITA");
      }
    } catch (e) {
      console.error(e);
      return;
    }
  };

  const info = (err, res, body) => {
    if (err || res.statusCode !== 200) {
      console.error(e, res.statusCode);
      return;
    }
    try {
      const data = JSON.parse(body);
      const msg = asmMsg(data.Report);
      if (msg) {
        bot.send({ room: "開発" }, msg);
      }
    } catch (e) {
      console.error(e);
      return;
    }
  };

  const asmMsg = (report) => {
    if (report.Control.Status !== "通常") {
      console.error("通常 では無い情報、スキップしました " + report.Control.Status);
    }
    let attachments = {
      author_name: report.Head.Title,
      color: "#FF4B00",
      footer: `${report.Control.PublishingOffice} ${report.Head.InfoType}`,
      ts: Math.floor(new Date(report.Head.ReportDateTime).getTime() / 1000)
    }
    switch (report.Head.InfoKind) {
      case "震度速報":
        attachments = message.MaxInt(attachments, report);
        break;
      case "震源速報":
        attachments = message.Hypocenter(attachments, report);
        break;
      case "地震情報":
        attachments = message.Earthquake(attachments, report);
        break;
      case "噴火速報":
        attachments = message.Eruption(attachments, report);
        break;
      case "噴火に関する火山観測報":
        attachments = message.Volcano(attachments, report);
        break;
      default:
        attachments = message.Other(attachments, report); // 投稿テスト用
        return; // 基本は投稿しない
    }
    return {
      attachments: [attachments]
    };
  };
};