import os
import time
import json
import logging

import redis
import requests
import slack

import messages as msg
from tools import *

kvs = redis.Redis()
client = slack.WebClient(token=os.environ['DISASTER_BOT_TOKEN'])
logging.basicConfig(level=logging.INFO, format='[%(levelname)s %(asctime)s] %(message)s', filename='/home/user/disasterbot.log')

def main():
    logging.info('POLLING START')
    while True:
        uuids = new_uuids()
        for uuid in uuids:
            data = info(uuid)
            logging.info('INFO FETCHED {} {}'.format(value(data, 'Report', 'Head', 'Title'), uuid))
            message = make_message(data)
            if len(message) == 0:
                logging.info('POST SKIPPED {} {}'.format(value(data, 'Report', 'Head', 'Title'), uuid))
                break
            send('#災害情報', message, uuid)
            # 震度5弱以上の地震情報をzatsudanに投稿
            mi = value(data, 'Report', 'Body', 'Intensity', 'Observation', 'MaxInt')
            if value(data, 'Report', 'Head', 'InfoKind') == '地震情報' and (mi == '5-' or mi == '5+' or mi == '6-' or mi == '6+' or mi == '7'):
                send('#zatsudan', message, uuid)
        time.sleep(10) # 3秒に一回ポーリング

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
        return msg.volcano_observation(data)
    if kind == '津波警報・注意報・予報':
        return msg.tsunami_alarm(data)
    if kind == '津波情報':
        return msg.tsunami_info(data)
    return ''

def send(channel, message, uuid):
    response = client.chat_postMessage(channel=channel, attachments=json.dumps(message))
    if response['ok']:
        logging.info('POST SUCCESS {} {}'.format(message[0]['author_name'], uuid))
    else:
        logging.error('POST FAILURE {} {}'.format(message[0]['author_name'], uuid))

def api_uri(src='/'):
    return 'https://kakudo.app/kishow' + src

def kvs_key(src):
    return 'DISASTER-BOT:' + src

if __name__ == '__main__':
    main()

