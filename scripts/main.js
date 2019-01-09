"use strict";
const redis = require("redis").createClient();
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
        redis.GET(`ALERTBOT:${uuid}`, (err, rep) => {
          if (err) {
            console.error(err);
            return;
          }
          // 「もう見たリスト」に登録していたらスキップ
          if (rep !== null) {
            return;
          }
          // UUIDのリンクから情報を取得して投稿
          request.get(`https://kakudo.app/kishow/${uuid}`, info);
          // 「もう見たリスト」に登録して重複して投稿しないように
          redis.SET(`ALERTBOT:${uuid}`, "MOUMITA", (err) => {
            if (err) {
              console.error(err);
            }
          });
          // 15分で「もう見たキャッシュ」を消す
          redis.EXPIRE(`ALERTBOT:${uuid}`, 60 * 15, (err) => {
            if (err) {
              console.error(err);
            }
          });
        });
      }
    } catch (e) {
      console.error(e, body, new Date);
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
        // 震度5弱以上で #zatsudan にも投稿
        if (data.Report.Head.InfoKind === "震度速報" || data.Report.Head.InfoKind === "地震情報") {
          const mi = data.Report.Body.Intensity.Observation.MaxInt;
          if (mi === "5-" || mi === "5+" || mi === "6-" || mi === "6+" || mi === "7") {
            bot.send({
              room: "zatsudan"
            }, msg);
          }
        }
        // 震度4以上で @here
        if (data.Report.Head.InfoKind === "震度速報") {
          if (mi === "4" || mi === "5-" || mi === "5+" || mi === "6-" || mi === "6+" || mi === "7") {
            msg.attachments[0].text = "@here 最大震度４以上";
          }
        }
        // 噴火速報 @here
        if (data.Report.Head.InfoKind === "噴火速報") {
          msg.attachments[0].text = "@here 噴火";
        }
        // #災害情報 に投稿
        bot.send({
          room: "災害情報"
        }, msg);
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