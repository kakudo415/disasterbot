"use strict";
const request = require("request");
const message = require("./message.js");

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
        if (bot.brain.get(`ALERTBOT:${uuid}`)) {
          continue;
        }
        request.get(`https://kakudo.app/kishow/${uuid}`, info);
        bot.brain.set(`ALERTBOT:${uuid}`, "もうみた");
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
        attachments = message.MaxInt(report);
        break;
      case "震源速報":
        attachments = message.Hypocenter(report);
        break;
      case "地震情報":
        attachments = message.Earthquake(report);
        break;
      case "噴火速報":
        attachments = message.Eruption(report);
        break;
      case "噴火に関する火山観測報":
        attachments = message.Volcano(report);
        break;
      default:
        return;
    }
    return {
      attachments: [attachments]
    };
  };
};