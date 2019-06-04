import time
import redis
import requests

import message as msg

kvs = redis.Redis()

def main():
    while True:
        uuids = new_uuids()
        for uuid in uuids:
            report = info(uuid)
            message = make_message(report)
            if len(message) == 0:
                break
            send('#災害情報', message)
        time.sleep(10) # 10秒に一回ポーリング

def new_uuids():
    response = requests.get(api_uri())
    uuids = response.json()['UUID']
    for uuid in uuids:
        # チェック済みのUUIDは無視する
        if kvs.get(kvs_key(uuid)) == 'CHECKED':
            uuids.remove(uuid)
        # 未チェックの物をチェック済みにする(15分間)
        kvs.set(kvs_key(uuid), 'CHECKED')
        kvs.expire(kvs_key, 60 * 15)
    return uuids

def info(uuid):
    response = requests.get(api_uri('/json/' + uuid))
    return response.json()

def make_message(report):
    # 訓練などの情報を無視する
    status = report['Control']['Status']
    if status != '通常':
        print('通常ではない情報、スキップしました => ' + status)
        return ''
    # 情報の種類に応じてメッセージを作成する
    kind = report['Head']['InfoKind']
    if kind == '震度速報':
        return msg.seismic_bulletin(report)
    if kind == '震源速報':
        pass
    if kind == '地震情報':
        pass
    if kind == '噴火速報':
        pass
    if kind == '噴火に関する火山観測報':
        pass
    print(format(json.dumps(msg.other(report), indent=2))) # For DEBUG
    return ''

def api_uri(src='/'):
    return 'https://kakudo.app/kishow' + src

def kvs_key(src):
    return 'DISASTER-BOT:' + src

if __name__ == '__main__':
    main()

