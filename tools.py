def value(d, *k):
    if len(k) == 0:
        return ''
    v = d.get(k[0], '')
    if type(v) == dict:
        return value(v, *k[1:])
    else:
        return v

