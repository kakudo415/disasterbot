def make_attachment(rep):
    return {
        'author_name': rep['Head']['Title'],
        'color': '#FF4B00',
        'footer': rep['Control']['PublishingOffice'] + ' ' + rep['Head']['InfoType']
    }

def seismic_bulletin(rep):
    attachment = make_attachment(rep)
    return [attachment]

def other(rep):
    attachment = make_attachment(rep)
    if len(rep['Head']['Headline']['Text']) > 0:
        attachment = rep['Head']['Headline']['Text']
    else:
        attachment = rep['Head']['InfoKind']
    return [attachment]

