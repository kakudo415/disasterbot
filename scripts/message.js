"use strict";
exports.MaxInt = (attachments, report) => {
  attachments.text = report.Head.Headline.Text;
  return attachments;
};
exports.Hypocenter = (attachments, report) => {
  attachments.text = report.Head.Headline.Text;
  return attachments;
};
exports.Earthquake = (attachments, report) => {
  attachments.text = report.Head.Headline.Text;
  return attachments;
};
exports.Eruption = (attachments, report) => {
  attachments.text = report.Head.Headline.Text;
  return attachments;
};
exports.Volcano = (attachments, report) => {
  attachments.text = report.Head.Headline.Text;
  return attachments;
};
exports.Other = (attachments, report) => {
  attachments.text = report.Head.Headline.Text ? report.Head.Headline.Text : report.Head.InfoKind;
  return attachments;
};