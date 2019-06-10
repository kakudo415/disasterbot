import os
import time
import json

import redis
import requests
import slack

import messages as msg
from tools import *

kvs = redis.Redis()
client = slack.WebClient(token=os.environ['DISASTER_BOT_TOKEN'])

def main():
    while True:
        uuids = new_uuids()
        for uuid in uuids:
            data = info(uuid)
            message = make_message(data)
            if len(message) == 0:
                break
            send('#災害情報', message)
        time.sleep(10) # 10秒に一回ポーリング

def new_uuids():
    unchecked = []
    response = requests.get(api_uri())
    uuids = response.json()['UUID']
    for uuid in uuids:
        # チェック済みのUUIDは無視する
        if kvs.get(kvs_key(uuid)) == None:
            unchecked.append(uuid)
        # 未チェックの物をチェック済みにする(15分間)
        kvs.set(kvs_key(uuid), 'CHECKED')
        kvs.expire(kvs_key(uuid), 60 * 15)
    return unchecked

def info(uuid):
    response = requests.get(api_uri('/json/' + uuid))
    return response.json()

def make_message(data):
    # 訓練などの情報を無視する
    status = value(data, 'Report', 'Control', 'Status')
    if status != '通常':
        print('通常ではない情報、スキップしました => ' + status)
        return ''
    # 情報の種類に応じてメッセージを作成する
    kind = value(data, 'Report', 'Head', 'InfoKind')
    if kind == '震度速報':
        return msg.seismic_bulletin(data)
    if kind == '震源速報':
        return msg.epicenter_bulletin(data)
    if kind == '地震情報':
        return msg.earthquake_info(data)
    if kind == '噴火速報':
        return msg.eruption_bulletin(data)
    if kind == '噴火に関する火山観測報':
        return volcano_observation(data)
    return msg.other(data)

def send(channel, message):
    client.chat_postMessage(channel=channel, attachments=json.dumps(message))

def api_uri(src='/'):
    return 'https://kakudo.app/kishow' + src

def kvs_key(src):
    return 'DISASTER-BOT:' + src

if __name__ == '__main__':
    main()

