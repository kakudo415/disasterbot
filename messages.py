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

def to_array(src):
    if type(src) == list:
        return src
    else:
        return [src]

def enum_intensity(obs):
    fields = []
    sint = value(obs, 'MaxInt')
    def enum():
        for pref in to_array(value(obs, 'Pref')):
            areas = []
            for area in to_array(value(pref, 'Area')):
                if sint == value(area, 'MaxInt'):
                    areas.append(value(area, 'Name').strip(value(pref, 'Name')))
            if len(areas) > 0:
                fields[-1]['value'] += ' 【{}】{}\n'.format(value(pref, 'Name'), ' '.join(areas))
        if len(fields[-1]['value']) == 0:
            fields.pop()
    # 震度ごとに地域をリスト化
    if sint == '7':
        fields.append({
            'title': '震度 7',
            'value': '',
            'short': False
        })
        enum()
        sint = '6+'
    if sint == '6+':
        fields.append({
            'title': '震度 6強',
            'value': '',
            'short': False
        })
        enum()
        sint = '6-'
    if sint == '6-':
        fields.append({
            'title': '震度 6弱',
            'value': '',
            'short': False
        })
        enum()
        sint = '5+'
    if sint == '5+':
        fields.append({
            'title': '震度 5強',
            'value': '',
            'short': False
        })
        enum()
        sint = '5-'
    if sint == '5-':
        fields.append({
            'title': '震度 5弱',
            'value': '',
            'short': False
        })
        enum()
        sint = '4'
    if sint == '4':
        fields.append({
            'title': '震度 4',
            'value': '',
            'short': False
        })
        enum()
        sint = '3'
    if sint == '3':
        fields.append({
            'title': '震度 3',
            'value': '',
            'short': False
        })
        enum()
        sint = '2'
    if sint == '2':
        fields.append({
            'title': '震度 2',
            'value': '',
            'short': False
        })
        enum()
        sint = '1'
    if sint == '1':
        fields.append({
            'title': '震度 1',
            'value': '',
            'short': False
        })
        enum()
    return fields

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

def earthquake_info(data):
    attachment = make_attachment(data)
    fields = []
    # 地震の規模 マグニチュード
    fields.append({
        'title': '規模',
        'value': 'M' + value(data, 'Report', 'Body', 'Earthquake', 'Magnitude'),
        'short': True
    })
    # 震度
    maxint = value(data, 'Report', 'Body', 'Intensity', 'Observation', 'MaxInt')
    if len(maxint) > 0:
        fields.append({
            'title': '最大震度',
            'value': maxint,
            'short': True
        })
    else:
        fields.append({
            'title': '震度',
            'value': '不明',
            'short': True
        })
    # 震源
    fields.append({
        'title': '震央地',
        'value': value(data, 'Report', 'Body', 'Earthquake', 'Hypocenter', 'Area', 'Name'),
        'short': True
    })
    depth = iso6709(value(data, 'Report', 'Body', 'Earthquake', 'Hypocenter', 'Area', 'Coordinate'))[2]
    depth = abs(int(depth)) // 1000
    fields.append({
        'title': '深さ',
        'value': str(depth) + 'km',
        'short': True
    })
    # 震度ごとの地域リスト
    fields.extend(enum_intensity(value(data, 'Report', 'Body', 'Intensity', 'Observation')))
    # その他情報
    fields.append({
        'title': 'その他',
        'value': value(data, 'Report', 'Body', 'Comments', 'ForecastComment', 'Text'),
        'short': True
    })
    attachment['fields'] = fields
    return [attachment]

# 噴火速報
def eruption_bulletin(data):
    attachment = make_attachment(data)
    fields = []
    fields.append({
        'title': '火山名',
        'value': value(data, 'Report', 'Body', 'VolcanoInfo', 'Item', 'Areas', 'Area', 'Name'),
        'short': False
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
    attachment['color'] = '#CCCCCC'
    return [attachment]

