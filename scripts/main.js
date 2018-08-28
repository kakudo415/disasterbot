'use strict';
let Fs = require('fs');
let Log = require('log');
let request = require('request');
let FeedParser = require('feedparser');
let xml2js = require('xml2js');
let bodyparser = require('body-parser');
let readable = require('stream').Readable;
let logger = new Log('debug', Fs.createWriteStream('./access_log', {flags: 'a'}));

module.exports = (robot) => {
  robot.router.use(bodyparser.text({type: '*/*'}));

  robot.hear(/(!|！)(alertbot|災害情報)/, (msg) => {
    msg.send('私は気象庁から地震・火山などの情報を取得し、 #災害情報 チャンネルに投稿します');
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
    let feeds = [];
    let stream = new readable;
    let feedparser = new FeedParser({});
    stream.push(req.body);
    stream.push(null);
    stream.pipe(feedparser);
    feedparser.on('readable', () => {
      let data;
      while (data = feedparser.read()) {
        feeds.push(data);
      }
    });
    feedparser.on('end', () => {
      feeds.forEach((feed) => {
        if (!feed.link.startsWith('http://xml.kishou.go.jp/')) {
          logger.info('"http://xml.kishou.go.jp/"で始まらない情報リンク、スキップしました');
          return;
        }
        request.get(feed.link, (feedErr, feedRes, feedBody) => {
          if (feedErr) {
            logger.error(feedErr.message);
            return;
          }
          xml2js.parseString(feedBody, (parseErr, parseResult) => {
            let Report = parseResult.Report;
            if (Report.Control[0].Status[0] !== '通常') {
              logger.info('通常では無い情報（訓練など）、スキップしました');
              return;
            }
            let message = '>>>';
            let date = new Date(Report.Head[0].ReportDateTime[0]);
            let time = `${date.getFullYear()}年 ${date.getMonth() + 1}月 ${date.getDate()}日 ${date.getHours()}時 ${date.getMinutes()}分 ${Report.Head[0].InfoType[0]}`;
            switch (Report.Head[0].InfoKind[0]) {  // 運用種別情報
              case '震度速報':
                let maxInt = Report.Body[0].Intensity[0].Observation[0].MaxInt[0];
                message += `*震度速報（${time}）*\n` +
                    `最大震度：${maxInt}`;
                if (maxInt == '5-' || maxInt == '5+' || maxInt == '6-' || maxInt == '6+' || maxInt == '7') {
                  message += ` @here`;
                }
                message += '\n';
                message += `最大震度を観測した地域：`;
                Report.Body[0].Intensity[0].Observation[0].Pref.forEach((pref) => {
                  if (pref.MaxInt[0] == maxInt) {
                    message += `${pref.Name[0]} `;
                  }
                });
                break;

              case '震源速報':
                message += `*震源速報（${time}）*\n` +
                    `震央地：${Report.Body[0].Earthquake[0].Hypocenter[0].Area[0].Name[0]}\n`;
                if (Report.Body[0].Earthquake[0]['jmx_eb:Magnitude'][0].$.condition === '不明') {
                  message += `マグニチュード：${Report.Body[0].Earthquake[0]['jmx_eb:Magnitude'][0].$.description}\n`;
                } else {
                  let m = Number(Report.Body[0].Earthquake[0]['jmx_eb:Magnitude'][0]._);
                  message += `マグニチュード：${m}`;
                  if (m >= 5) {
                    message += ' @here';
                  }
                  message += '\n';
                }
                message += `${Report.Body[0].Comments[0].ForecastComment[0].Text[0]}`;
                break;

                // case '震源要素更新のお知らせ':
                //   break;

                // case '地震回数情報':
                //   break;

                // case '地震の活動状況等に関する情報':
                //   break;

              case '地震情報':
                message += `*${Report.Head[0].Title[0]}（${time}）*\n` +
                    `震央地：${Report.Body[0].Earthquake[0].Hypocenter[0].Area[0].Name[0]}\n`;
                if (Report.Body[0].Earthquake[0]['jmx_eb:Magnitude'][0].$.condition === '不明') {
                  message += `マグニチュード：${Report.Body[0].Earthquake[0]['jmx_eb:Magnitude'][0].$.description}\n`;
                } else {
                  let m = Number(Report.Body[0].Earthquake[0]['jmx_eb:Magnitude'][0]._);
                  message += `マグニチュード：${m}`;
                  if (m >= 5) {
                    message += ' @here';
                  }
                  message += '\n';
                }
                message += `${Report.Body[0].Comments[0].ForecastComment[0].Text[0]}`;
                break;

                // case '津波情報':
                //   break;

                // case '津波警報・注意報・予報':
                //   break;

                // case '噴火速報':
                //   break;

              case '噴火に関する火山観測報':
                message += `*${Report.Head[0].InfoKind[0]}（${time}）*\n` +
                    `場所：${Report.Body[0].VolcanoInfo[0].Item[0].Areas[0].Area[0].Name[0]} ${Report.Body[0].VolcanoInfo[0].Item[0].Areas[0].Area[0].CraterName[0]}\n` +
                    `現象：${Report.Body[0].VolcanoInfo[0].Item[0].Kind[0].Name[0]}`;
                break;

              case '降灰予報':
                return;  // 降灰予報はこのBOTの主旨から外れるので、とりあえずは投稿しない（要望次第）
              case '東海地震関連情報':
                return;  // 東海地震関連情報はこのBOTの主旨から外れるので、とりあえずは投稿しない（要望次第）
              case '火山の状況に関する解説情報':
                return;  // 火山の状況に関する解説情報はこのBOTの主旨から外れるので、とりあえずは投稿しない（要望次第）

              default:
                message += `*${Report.Head[0].Title[0]}*\n${Report.Head[0].Headline[0].Text[0]}`;
            }
            robot.send({room: '災害情報'}, message);
          });
        });
      });
    });
    res.status(200).end();
    logger.info(req.body);
  });
};