"use strict";

// 震度速報
exports.MaxInt = (attachments, Report) => {
  attachments.fields = [];
  intFields(Report.Body.Intensity.Observation).forEach((field) => {
    attachments.fields.push(field);
  });
  return attachments;
};

// 震源速報
exports.Hypocenter = (attachments, Report) => {
  let fields = [];
  fields.push({
    title: "震央地",
    value: Report.Body.Earthquake.Hypocenter.Area.Name,
    short: true
  });
  fields.push({
    title: "深さ",
    value: ISO6709(Report.Body.Earthquake.Hypocenter.Area.Coordinate)[3],
    short: true
  });
  fields.push({
    title: "その他",
    value: Report.Body.Comments.ForecastCommment.Text,
    short: false
  });
  return attachments;
};

// 地震情報
exports.Earthquake = (attachments, Report) => {
  let fields = [];
  fields.push({
    title: "震央地",
    value: Report.Body.Earthquake.Hypocenter.Area.Name,
    short: true
  });
  fields.push({
    title: "深さ",
    value: ISO6709(Report.Body.Earthquake.Hypocenter.Area.Coordinate)[3],
    short: true
  });
  fields.push({
    title: "規模",
    value: "M" + Report.Body.Earthquake.Magnitude,
    short: true
  });
  if (Report.Body.Intensity) {
    fields.push({
      title: "最大震度",
      value: Report.Body.Intensity.Observation.MaxInt,
      short: true
    });
    intFields(Report.Body.Intensity.Observation).forEach((field) => {
      fields.push(field);
    });
  } else {
    fields.push({
      title: "震度",
      value: "不明",
      short: true
    });
  }
  fields.push({
    title: "その他",
    value: Report.Body.Comments.ForecastComment.Text,
    short: false
  });
  attachments.fields = fields;
  return attachments;
};

// 噴火速報
exports.Eruption = (attachments, Report) => {
  let fields = [];
  fields.push({
    title: "火山名",
    value: Report.Body.VolcanoInfo.Item.Areas.Area,
    short: false
  });
  return attachments;
};

// 噴火に関する火山観測報
exports.Volcano = (attachments, Report) => {
  let fields = [];
  fields.push({
    title: "場所",
    value: `${Report.Body.VolcanoInfo.Item.Areas.Area.Name} ${Report.Body.VolcanoInfo.Item.Areas.Area.CraterName}`,
    short: true
  });
  fields.push({
    title: "現象",
    value: `${Report.Body.VolcanoInfo.Item.Kind.Name}`,
    short: true
  });
  attachments.fields = fields;
  return attachments;
};

// その他
exports.Other = (attachments, Report) => {
  attachments.text = Report.Head.Headline.Text ? Report.Head.Headline.Text : Report.Head.InfoKind;
  return attachments;
};

// 配列じゃないObjectを配列化
const ToArray = (src) => {
  if (Array.isArray(src)) {
    return src;
  }
  return [src];
};

// ISO6709形式の位置情報をパースして km に変換
const ISO6709 = (src) => {
  let result = src.match(/([\+\-][\w|\.]+)([\+\-][\w|\.]+)([\+\-][\w|\.]+)\//);
  if (result === null) {
    return [null, "不明", "不明", "不明"];
  }
  for (let i = 1; i < result.length; i++) {
    result[i] = Math.floor(Number(result[i].replace("-", "")) / 1000);
    if (result[i] === undefined) {
      result[i] = "不明";
    } else if (0 === result[i]) {
      result[i] = "ごく浅い";
    } else if (600 <= result[i]) {
      result[i] = "600km以上";
    } else {
      result[i] = result[i] + "km";
    }
  }
  return result;
};

const intFields = (obs) => {
  let fields = [];
  let int = obs.MaxInt;
  // 最後に作ったfieldの該当地域
  const list = () => {
    ToArray(obs.Pref).forEach((pref) => {
      let areas = [];
      ToArray(pref.Area).forEach((area) => {
        if (int === area.MaxInt) {
          areas.push(area.Name.replace(pref.Name, ""));
        }
      });
      if (areas.length > 0) {
        fields[fields.length - 1].value += `【${pref.Name}】${areas.join(" ")}\n`;
      }
    });
    if (fields[fields.length - 1].value.length === 0) {
      fields.pop();
    }
  };
  while (true) {
    switch (int) {
      case "7":
        fields.push({
          title: "震度 7",
          value: "",
          short: false
        });
        list();
        int = "6+";
        break;
      case "6+":
        fields.push({
          title: "震度 6強",
          value: "",
          short: false
        });
        list();
        int = "6-";
        break;
      case "6-":
        fields.push({
          title: "震度 6弱",
          value: "",
          short: false
        });
        list();
        int = "5+";
        break;
      case "5+":
        fields.push({
          title: "震度 5強",
          value: "",
          short: false
        });
        list();
        int = "5-";
        break;
      case "5-":
        fields.push({
          title: "震度 5弱",
          value: "",
          short: false
        });
        list();
        int = "4";
        break;
      case "4":
        fields.push({
          title: "震度 4",
          value: "",
          short: false
        });
        list();
        int = "3";
        break;
      case "3":
        fields.push({
          title: "震度 3",
          value: "",
          short: false
        });
        list();
        int = "2";
        break;
      case "2":
        fields.push({
          title: "震度 2",
          value: "",
          short: false
        });
        list();
        int = "1";
        break;
      case "1":
        fields.push({
          title: "震度 1",
          value: "",
          short: false
        });
        list();
        return fields;
      default:
        return fields;
    }
  }
};