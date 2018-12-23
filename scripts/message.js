"use strict";

// 震度速報
exports.MaxInt = (attachments, Report) => {
  attachments.text = Report.Head.Headline.Text;
  return attachments;
};

// 震源速報
exports.Hypocenter = (attachments, Report) => {
  attachments.text = Report.Head.Headline.Text;
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
    value: ISO6709(Report.Body.Earthquake.Hypocenter.Area.Coordinate)[3].replace("-", "") + "km",
    short: true
  });
  fields.push({
    title: "規模",
    value: Report.Body.Earthquake.Magnitude,
    short: true
  });
  fields.push({
    title: "最大震度",
    value: Report.Body.Intensity.MaxInt,
    short: true
  });
  fields.push({
    title: "その他",
    value: Report.Body.Comments.ForecastCommment,
    short: false
  });
  attachments.fields = fields;
  return attachments;
};

// 噴火速報
exports.Eruption = (attachments, Report) => {
  attachments.text = Report.Head.Headline.Text;
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

const ISO6709 = (src) => {
  return src.match(/([\+\-][\w|\.]+)([\+\-][\w|\.]+)([\+\-][\w|\.]+)\//);
};