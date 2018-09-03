'use strict';
let fs = require('fs');
let log = require('log');
let request = require('request');
let feedParser = require('feedparser');
let xml2js = require('xml2js');
let bodyparser = require('body-parser');
let readable = require('stream').Readable;
let logger = new log('debug', fs.createWriteStream('./access_log', {flags: 'a'}));

const ISO6709 = /[\+\-].*[\+\-].*[\+\-](.*)\//;

// 半角英数文字を全角文字に変換する
const toFullWith = (input) => {
  input = String(input);
  return input.replace(/[ -~]/g, (c) => {
    return String.fromCharCode(c.charCodeAt(0) + 0xFEE0);
  });
};

// ISO6709形式の座標データから深さを読み取り整形して返す
const depth = (input) => {
  let match = input.match(ISO6709);
  if (match === null) {
    return '不明';
  } else {
    let d = Math.floor(Number(match[1]) / 1000);
    if (d === 0) {
      return 'ごく浅い';
    } else if (d > 600) {
      return '６００キロ以上';
    } else {
      return toFullWith(d) + 'キロ';
    }
  }
};

// 震度を降順のfieldの配列にする
const intList = (obs) => {
  let int = obs.MaxInt[0];
  let fields = new Array;
  while (true) {
    const list = () => {
      obs.Pref.forEach((pref) => {
        if (pref.MaxInt[0] == int) {
          fields[fields.length - 1].value += `${pref.Name[0]} `;
        }
      });
      if (fields[fields.length - 1].value.length === 0) {
        fields.pop();
      }
    };
    switch (int) {
      case '7':
        fields.push({
          title: '震度７',
          value: '',
          short: false
        });
        list();
        int = '6+';
        break;
      case '6+':
        fields.push({
          title: '震度６強',
          value: '',
          short: false
        });
        list();
        int = '6-';
        break;
      case '6-':
        fields.push({
          title: '震度６弱',
          value: '',
          short: false
        });
        list();
        int = '5+';
        break;
      case '5+':
        fields.push({
          title: '震度５強',
          value: '',
          short: false
        });
        list();
        int = '5-';
        break;
      case '5-':
        fields.push({
          title: '震度５弱',
          value: '',
          short: false
        });
        list();
        int = '4';
        break;
      case '4':
        fields.push({
          title: '震度４',
          value: '',
          short: false
        });
        list();
        int = '3';
        break;
      case '3':
        fields.push({
          title: '震度３',
          value: '',
          short: false
        });
        list();
        int = '2';
        break;
      case '2':
        fields.push({
          title: '震度２',
          value: '',
          short: false
        });
        list();
        int = '1';
        break;
      case '1':
        fields.push({
          title: '震度１',
          value: '',
          short: false
        });
        list();
        return fields;
      default:
        return fields;
    }
  }
};

module.exports = (robot) => {
  robot.router.use(bodyparser.text({type: '*/*'}));

  // 呼ばれたら説明を返す
  robot.hear(/(!|！)(alertbot|災害情報)/, (msg) => {
    msg.send('私は気象庁から地震・火山などの情報を取得し、 #災害情報 チャンネルに投稿します');
  });

  // Subscriber登録・登録解除
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

  // Atomフィードをパースして投稿する
  robot.router.post('/sub', (req, res) => {
    let feeds = [];
    let stream = new readable;
    let feedparser = new feedParser({});
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
        // フィード内のURLを順にリクエストする
        request.get(feed.link, (feedErr, feedRes, feedBody) => {
          if (feedErr) {
            logger.error(feedErr);
            return;
          }
          xml2js.parseString(feedBody, (parseErr, parseResult) => {
            if (parseErr) {
              logger.error(parseErr);
            }
            let Report = parseResult.Report;
            if (Report.Control[0].Status[0] !== '通常') {
              logger.info('通常では無い情報（訓練など）、スキップしました');
              return;
            }
            let msg = new Object;
            let timestamp = Math.floor(new Date(Report.Head[0].ReportDateTime[0]).getTime() / 1000);
            // 運用種別情報に応じてパースする
            switch (Report.Head[0].InfoKind[0]) {
              case '震度速報':
                msg.attachments = [{
                  fields: [{}]
                }];
                let mi = `${Report.Body[0].Intensity[0].Observation[0].MaxInt[0]}`;
                if (mi === '4' || mi === '5-' || mi === '5+' || mi === '6-' || mi === '6+' || mi === '7') {
                  msg.attachments[0].text = '@here（最大震度４以上なのでメンションしました）';
                }
                intList(Report.Body[0].Intensity[0].Observation[0]).forEach((field) => {
                  msg.attachments[0].fields.push(field);
                });
                break;

              case '震源速報':
                msg.attachments = [{
                  fields: [
                    {
                      title: `震央地`,
                      value: `${Report.Body[0].Earthquake[0].Hypocenter[0].Area[0].Name[0]}`,
                      short: true
                    }
                  ]
                }];
                msg.attachments[0].fields.push({
                  title: `深さ`,
                  value: `${depth(Report.Body[0].Earthquake[0].Hypocenter[0].Area[0]['jmx_eb:Coordinate'][0]._)}`,
                  short: true
                });
                msg.attachments[0].fields.push({
                  title: `その他`,
                  value: `${Report.Body[0].Comments[0].ForecastComment[0].Text[0]}`,
                  short: false
                });
                break;

              case '地震情報':
                msg.attachments = [{
                  fields: [
                    {
                      title: `震央地`,
                      value: `${Report.Body[0].Earthquake[0].Hypocenter[0].Area[0].Name[0]}`,
                      short: true
                    }
                  ]
                }];
                msg.attachments[0].fields.push({
                  title: `深さ`,
                  value: `${depth(Report.Body[0].Earthquake[0].Hypocenter[0].Area[0]['jmx_eb:Coordinate'][0]._)}`,
                  short: true
                });
                if (Report.Body[0].Earthquake[0]['jmx_eb:Magnitude'][0].$.condition === '不明') {
                  msg.attachments[0].fields.push({
                    title: `マグニチュード`,
                    value: `${Report.Body[0].Earthquake[0]['jmx_eb:Magnitude'][0].$.description}`,
                    short: true
                  });
                } else {
                  msg.attachments[0].fields.push({
                    title: `マグニチュード`,
                    value: `${toFullWith(Report.Body[0].Earthquake[0]['jmx_eb:Magnitude'][0]._)}`,
                    short: true
                  });
                }
                if (Report.Body[0].Intensity) {
                  msg.attachments[0].fields.push({
                    title: `最大震度`,
                    value: `${toFullWith(Report.Body[0].Intensity[0].Observation[0].MaxInt[0])}`,
                    short: true
                  })
                  intList(Report.Body[0].Intensity[0].Observation[0]).forEach((field) => {
                    msg.attachments[0].fields.push(field);
                  });
                } else {
                  msg.attachments[0].fields.push({
                    title: `震度`,
                    value: `不明`,
                    short: true
                  });
                }
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
                let areas = '';
                Report.Body[0].VolcanoInfo[0].Item[0].Areas[0].Area.forEach((area) => {
                  areas += `${area.Name[0]} `;
                });
                msg.attachments = [{
                  fields: [
                    {
                      title: `火山名`,
                      value: areas,
                      short: false
                    }
                  ]
                }];
                break;

              case '噴火に関する火山観測報':
                msg.attachments = [{
                  fields: [
                    {
                      title: `場所`,
                      value: `${Report.Body[0].VolcanoInfo[0].Item[0].Areas[0].Area[0].Name[0]} ${Report.Body[0].VolcanoInfo[0].Item[0].Areas[0].Area[0].CraterName[0]}`,
                      short: true
                    },
                    {
                      title: `現象`,
                      value: `${Report.Body[0].VolcanoInfo[0].Item[0].Kind[0].Name[0]}`,
                      short: true
                    }
                  ]
                }];
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
                msg.attachments = [{
                  text: `${Report.Head[0].Headline[0].Text[0]}`
                }];
            }

            msg.attachments[0].author_name = `${Report.Head[0].Title[0]}`;                                          // タイトルとして利用
            msg.attachments[0].color = `#FF4B00`;                                                                   // JIS安全色 赤
            msg.attachments[0].footer = `${Report.Control[0].PublishingOffice[0]}　${Report.Head[0].InfoType[0]}`;  // 発表元 発表・訂正・取消
            msg.attachments[0].ts = `${timestamp}`;                                                                 // 情報のUNIX時間
            robot.send({room: '災害情報'}, msg);                                                                    // 災害情報チャンネルに投稿
          });
        });
      });
    });
    res.status(200).end();
    logger.info(req.body);
  });
};