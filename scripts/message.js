"use strict";

// 震度速報
exports.MaxInt = (attachments, report) => {
  attachments.text = report.Head.Headline.Text;
  return attachments;
};

// 震源速報
exports.Hypocenter = (attachments, report) => {
  attachments.text = report.Head.Headline.Text;
  return attachments;
};

// 地震情報
exports.Earthquake = (attachments, report) => {
  fields = [];
  fields.push({
    title: "震央地",
    value: report.Body.Earthquake.Hypocenter.Area.Name,
    short: true
  });
  fields.push({
    title: "深さ",
    value: `${ISO6709(report.Body.Earthquake.Hypocenter.Area["jmx_eb:Coordinate"])[3].replace("-", "")}km`,
    short: true
  });
  attachments.fields = fields;
  return attachments;
};

// 噴火速報
exports.Eruption = (attachments, report) => {
  attachments.text = report.Head.Headline.Text;
  return attachments;
};

// 噴火に関する火山観測報
exports.Volcano = (attachments, report) => {
  fields = [];
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
exports.Other = (attachments, report) => {
  attachments.text = report.Head.Headline.Text ? report.Head.Headline.Text : report.Head.InfoKind;
  return attachments;
};

const ISO6709 = (src) => {
  return src.match(/([\+\-][\w|\.]+)([\+\-][\w|\.]+)([\+\-][\w|\.]+)\//);
};