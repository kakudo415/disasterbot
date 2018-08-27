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
          xml2js.parseString(feedBody, {trim: true, explicitArray: false}, (parseErr, parseResult) => {
            let Report = parseResult.Report;
            if (Report.Control.Status !== '通常') {
              logger.info('通常では無い情報（訓練など）、スキップしました');
              return;
            }
            switch (Report.Head.InfoKind) {
              case '地震情報':
                console.log(Report.Body.Earthquake);
                robot.send({room: '災害情報'}, `>>>*${Report.Head.Title}*\n震央地 : ${Report.Body.Earthquake.Hypocenter.Area.Name}\nマグニチュード : ${Report.Body.Earthquake['jmx_eb:Magnitude']._} (単位 : ${Report.Body.Earthquake['jmx_eb:Magnitude'].$.type})\n付加文: ${Report.Body.Comments.ForecastComment.Text}`);
                break;
              case '降灰予報':
                // 降灰予報はこのBOTの主旨から外れるので、とりあえずは投稿しない（要望次第）
                break;
              default:
                robot.send({room: '災害情報'}, `>>>*${Report.Head.Title}*\n説明 : ${Report.Head.Headline.Text}`);
            }
          });
        });
      });
    });
    res.status(200).end();
    logger.info(req.body);
  });
};