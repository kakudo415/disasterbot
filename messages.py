import re

from tools import *

def make_attachment(data):
    return {
        'author_name': value(data, 'Report', 'Head', 'Title'),
        'color': '#FF4B00',
        'footer': value(data, 'Report', 'Control', 'PublishingOffice') + ' ' + value(data, 'Report', 'Head', 'InfoType')
    }

def iso6709(src):
    match = re.search(r'([\+\-][\w|\.]+)([\+\-][\w|\.]+)([\+\-][\w|\.]+)\/', src)
    dest = []
    dest.append(match.group(1))
    dest.append(match.group(2))
    dest.append(match.group(3))
    return dest

# 震度速報
def seismic_bulletin(data):
    attachment = make_attachment(data)
    fields = []
    attachment['fields'] = fields
    return [attachment]

# 震源情報
def epicenter_bulletin(data):
    attachment = make_attachment(data)
    fields = []
    fields.append({
        'title': '震央地',
        'value': value(data, 'Report', 'Earthquake', 'Hypocenter', 'Area', 'Name'),
        'short': True
    })
    fields.append({
        'title': '深さ',
        'value': iso6709(value(data, 'Report', 'Body', 'Earthquake', 'Area', 'Coordinate')),
        'short': True
    })
    fields.append({
        'title': 'その他',
        'value': value(data, 'Report', 'Body', 'Comments', 'ForecastComment', 'Text'),
        'short': False
    })
    attachment['fields'] = fields
    return [attachment]

# 噴火に関する火山観測報
def volcano_observation(data):
    attachment = make_attachment(data)
    fields = []
    fields.append({
        'title': '場所',
        'value': value(data, 'Report', 'Body', 'VolcanoInfo', 'Item', 'Areas', 'Area', 'Name') + ' ' + value(data, 'Report', 'Body', 'VolcanoInfo', 'Item', 'Areas', 'Area', 'CraterName'),
        'short': True
    })
    fields.append({
        'title': '現象',
        'value': value(data, 'Report', 'Body', 'VolcanoInfo', 'Item', 'Kind', 'Name'),
        'short': True
    })
    attachment['fields'] = fields
    return [attachment]

def other(data):
    attachment = make_attachment(data)
    if len(value(data, 'Report', 'Head', 'Headline', 'Text')) > 0:
        attachment['text'] = value(data, 'Report', 'Head', 'Headline', 'Text')
    else:
        attachment['text'] = value(data, 'Report', 'Head', 'InfoKind')
    return [attachment]

