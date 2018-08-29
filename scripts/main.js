'use strict';
let Fs = require('fs');
let Log = require('log');
let request = require('request');
let FeedParser = require('feedparser');
let xml2js = require('xml2js');
let bodyparser = require('body-parser');
let readable = require('stream').Readable;
let logger = new Log('debug', Fs.createWriteStream('./access_log', {flags: 'a'}));

const iso6709 = /[\+\-].*[\+\-].*[\+\-](.*)\//;

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
            let msg = new Object;
            let timestamp = Math.floor(new Date(Report.Head[0].ReportDateTime[0]).getTime() / 1000);
            switch (Report.Head[0].InfoKind[0]) {  // 運用種別情報
              case '震度速報':
                let maxInt = Report.Body[0].Intensity[0].Observation[0].MaxInt[0];
                msg.attachments = [{
                  author_name: `${Report.Head[0].Title[0]}`,
                  footer: `${Report.Head[0].InfoType[0]}`,
                  fields: [
                    {
                      title: `最大震度`,
                      value: `${maxInt}`,
                      short: true
                    }
                  ],
                  ts: `${timestamp}`,
                  color: `#795548`
                }];
                let maxIntArea = '';
                Report.Body[0].Intensity[0].Observation[0].Pref.forEach((pref) => {
                  if (pref.MaxInt[0] == maxInt) {
                    maxIntArea += `${pref.Name[0]} `;
                  }
                });
                msg.attachments[0].fields.push({
                  title: `最大震度を観測した地域`,
                  value: `${maxIntArea}`,
                  short: false
                });
                break;

              case '震源速報':
                msg.attachments = [
                  {
                    author_name: `${Report.Head[0].Title[0]}`,
                    fields: [
                      {
                        title: `震央地`,
                        value: `${Report.Body[0].Earthquake[0].Hypocenter[0].Area[0].Name[0]}`,
                        short: true
                      },
                      {
                        title: `深さ`,
                        value: `${Report.Body[0].Earthquake[0].Hypocenter[0].Area[0]['jmx_eb:Coordinate'][0]._.match(iso6709)[1] / 1000}km`,
                        short: true
                      }
                    ],
                    footer: `${Report.Head[0].InfoType[0]}`,
                    ts: `${timestamp}`,
                    color: `#795548`
                  }
                ];
                msg.attachments[0].fields.push({
                  title: `その他`,
                  value: `${Report.Body[0].Comments[0].ForecastComment[0].Text[0]}`,
                  short: false
                });
                break;

              case '地震情報':
                msg.attachments = [
                  {
                    author_name: `${Report.Head[0].Title[0]}`,
                    fields: [
                      {
                        title: `震央地`,
                        value: `${Report.Body[0].Earthquake[0].Hypocenter[0].Area[0].Name[0]}`,
                        short: true
                      },
                      {
                        title: `深さ`,
                        value: `${Report.Body[0].Earthquake[0].Hypocenter[0].Area[0]['jmx_eb:Coordinate'][0]._.match(iso6709)[1] / 1000}km`,
                        short: true
                      }
                    ],
                    footer: `${Report.Head[0].InfoType[0]}`,
                    ts: `${timestamp}`,
                    color: `#795548`
                  }
                ];
                if (Report.Body[0].Earthquake[0]['jmx_eb:Magnitude'][0].$.condition === '不明') {
                  msg.attachments[0].fields.push({
                    title: `マグニチュード`,
                    value: `${Report.Body[0].Earthquake[0]['jmx_eb:Magnitude'][0].$.description}`,
                    short: true
                  });
                } else {
                  msg.attachments[0].fields.push({
                    title: `マグニチュード`,
                    value: `${Report.Body[0].Earthquake[0]['jmx_eb:Magnitude'][0]._}`,
                    short: true
                  });
                }
                msg.attachments[0].fields.push({
                  title: `最大震度`,
                  value: `${Report.Body[0].Intensity[0].Observation[0].MaxInt[0]}`,
                  short: true
                });
                msg.attachments[0].fields.push({
                  title: `その他`,
                  value: `${Report.Body[0].Comments[0].ForecastComment[0].Text[0]}`,
                  short: false
                });
                break;

                // case '津波情報':
                //   break;

                // case '津波警報・注意報・予報':
                //   break;

              case '噴火速報':
                msg += `*噴火速報（${time}）*\n` +
                    `火山名：`;
                Report.Body[0].VolcanoInfo[0].Item[0].Areas[0].Area.forEach((area) => {
                  msg += `${area.Name[0]} `;
                });
                msg += `@here`;
                break;

              case '噴火に関する火山観測報':
                msg += `*${Report.Head[0].InfoKind[0]}（${time}）*\n` +
                    `場所：${Report.Body[0].VolcanoInfo[0].Item[0].Areas[0].Area[0].Name[0]} ${Report.Body[0].VolcanoInfo[0].Item[0].Areas[0].Area[0].CraterName[0]}\n` +
                    `現象：${Report.Body[0].VolcanoInfo[0].Item[0].Kind[0].Name[0]}`;
                break;

                // case '噴火警報・予報':
                //   break;

              case '地震の活動状況等に関する情報':
                return;  // 地震の活動状況等に関する情報はこのBOTの主旨から外れるので、とりあえずは投稿しない（要望次第）
              case '震源要素更新のお知らせ':
                return;  // 震源要素更新のお知らせはこのBOTの主旨から外れるので、とりあえずは投稿しない（要望次第）
              case '地震回数情報':
                return;  // 地震回数情報はこのBOTの主旨から外れるので、とりあえずは投稿しない（要望次第）
              case '降灰予報':
                return;  // 降灰予報はこのBOTの主旨から外れるので、とりあえずは投稿しない（要望次第）
              case '東海地震関連情報':
                return;  // 東海地震関連情報はこのBOTの主旨から外れるので、とりあえずは投稿しない（要望次第）
              case '火山の状況に関する解説情報':
                return;  // 火山の状況に関する解説情報はこのBOTの主旨から外れるので、とりあえずは投稿しない（要望次第）

              default:
                msg += `>>>*${Report.Head[0].Title[0]}*\n${Report.Head[0].Headline[0].Text[0]}`;
            }
            robot.send({room: '災害情報'}, msg);
          });
        });
      });
    });
    res.status(200).end();
    logger.info(req.body);
  });
};