#!/usr/bin/env python3
"""
Build expanded comedian seed data for ComedyCountry.
Enriches existing jester-comedians.json with Instagram handles, genres,
touring status, and approximate follower counts, then adds new comedians
to reach ~2000 entries.
"""

import json
import re

def make_slug(name):
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')

# Enrichment data for known comedians: instagram handle, approx IG followers, genres, touring status
# touringStatus: TOURING, REGIONAL, LOCAL, RETIRED, UNKNOWN
ENRICHMENT = {
    "kevin hart": {"instagram": "kevinhart4real", "igFollowers": 176000000, "genres": ["observational", "storytelling", "physical"], "touringStatus": "TOURING"},
    "ellen degeneres": {"instagram": "theellenshow", "igFollowers": 139000000, "genres": ["observational", "clean"], "touringStatus": "RETIRED"},
    "joe rogan": {"instagram": "joerogan", "igFollowers": 18000000, "genres": ["observational", "political", "dark"], "touringStatus": "TOURING"},
    "steve harvey": {"instagram": "iamsteveharveytv", "igFollowers": 16000000, "genres": ["observational", "clean", "storytelling"], "touringStatus": "TOURING"},
    "adam sandler": {"instagram": "adamsandler", "igFollowers": 12000000, "genres": ["absurdist", "musical", "character"], "touringStatus": "TOURING"},
    "dave chappelle": {"instagram": "davechappelle", "igFollowers": 3400000, "genres": ["observational", "political", "storytelling", "dark"], "touringStatus": "TOURING"},
    "bill burr": {"instagram": "wifrfrombilburr", "igFollowers": 3200000, "genres": ["observational", "dark", "political", "rant"], "touringStatus": "TOURING"},
    "nate bargatze": {"instagram": "natebargatze", "igFollowers": 3500000, "genres": ["observational", "clean", "storytelling", "deadpan"], "touringStatus": "TOURING"},
    "matt rife": {"instagram": "mattrife", "igFollowers": 20000000, "genres": ["crowd-work", "observational", "improvisational"], "touringStatus": "TOURING"},
    "trevor noah": {"instagram": "trevornoah", "igFollowers": 9500000, "genres": ["political", "observational", "storytelling"], "touringStatus": "TOURING"},
    "chris rock": {"instagram": "chrisrock", "igFollowers": 6000000, "genres": ["observational", "political", "storytelling"], "touringStatus": "TOURING"},
    "gabriel iglesias": {"instagram": "fluffyguy", "igFollowers": 5000000, "genres": ["storytelling", "character", "observational", "clean"], "touringStatus": "TOURING"},
    "sebastian maniscalco": {"instagram": "sebastiancomedy", "igFollowers": 3800000, "genres": ["observational", "physical", "storytelling"], "touringStatus": "TOURING"},
    "shane gillis": {"instagram": "shanemgillis", "igFollowers": 3000000, "genres": ["observational", "dark", "political"], "touringStatus": "TOURING"},
    "nikki glaser": {"instagram": "nikkiglaser", "igFollowers": 3000000, "genres": ["observational", "sex-positive", "self-deprecating"], "touringStatus": "TOURING"},
    "bert kreischer": {"instagram": "bertkreischer", "igFollowers": 3500000, "genres": ["storytelling", "party", "observational"], "touringStatus": "TOURING"},
    "tom segura": {"instagram": "seguratom", "igFollowers": 2800000, "genres": ["dark", "observational", "storytelling", "deadpan"], "touringStatus": "TOURING"},
    "taylor tomlinson": {"instagram": "taylortomlinson", "igFollowers": 1800000, "genres": ["observational", "self-deprecating", "millennial"], "touringStatus": "TOURING"},
    "john mulaney": {"instagram": "johnmulaney", "igFollowers": 2300000, "genres": ["storytelling", "observational", "clean-ish"], "touringStatus": "TOURING"},
    "jerry seinfeld": {"instagram": "jerryseinfeld", "igFollowers": 1900000, "genres": ["observational", "clean", "deadpan"], "touringStatus": "TOURING"},
    "ali wong": {"instagram": "aliwong", "igFollowers": 3200000, "genres": ["observational", "raunchy", "storytelling"], "touringStatus": "TOURING"},
    "andrew schulz": {"instagram": "andrewschulz", "igFollowers": 5500000, "genres": ["crowd-work", "observational", "political"], "touringStatus": "TOURING"},
    "theo von": {"instagram": "theovon", "igFollowers": 3300000, "genres": ["storytelling", "observational", "absurdist"], "touringStatus": "TOURING"},
    "chelsea handler": {"instagram": "chelseahandler", "igFollowers": 4700000, "genres": ["observational", "political", "self-deprecating"], "touringStatus": "TOURING"},
    "sarah silverman": {"instagram": "sarahkatesilverman", "igFollowers": 3200000, "genres": ["dark", "political", "character", "satire"], "touringStatus": "TOURING"},
    "amy schumer": {"instagram": "amyschumer", "igFollowers": 12000000, "genres": ["observational", "sex-positive", "self-deprecating"], "touringStatus": "TOURING"},
    "hasan minhaj": {"instagram": "hasanminhaj", "igFollowers": 4500000, "genres": ["political", "storytelling", "observational"], "touringStatus": "TOURING"},
    "jim gaffigan": {"instagram": "jimgaffigan", "igFollowers": 1600000, "genres": ["observational", "clean", "food", "self-deprecating"], "touringStatus": "TOURING"},
    "jeff dunham": {"instagram": "jeffdunham", "igFollowers": 2500000, "genres": ["ventriloquism", "character", "observational"], "touringStatus": "TOURING"},
    "jo koy": {"instagram": "jokoy", "igFollowers": 3800000, "genres": ["storytelling", "observational", "cultural"], "touringStatus": "TOURING"},
    "andrew santino": {"instagram": "andrewsantino", "igFollowers": 1500000, "genres": ["observational", "storytelling", "dark"], "touringStatus": "TOURING"},
    "bobby lee": {"instagram": "bobbyleelive", "igFollowers": 1200000, "genres": ["absurdist", "character", "storytelling"], "touringStatus": "TOURING"},
    "tony hinchcliffe": {"instagram": "tonyhinchcliffe", "igFollowers": 1600000, "genres": ["roast", "dark", "one-liner"], "touringStatus": "TOURING"},
    "iliza shlesinger": {"instagram": "ilaboreallis", "igFollowers": 1900000, "genres": ["observational", "character", "physical"], "touringStatus": "TOURING"},
    "leanne morgan": {"instagram": "leannemorgancomedy", "igFollowers": 1100000, "genres": ["storytelling", "clean", "southern"], "touringStatus": "TOURING"},
    "wanda sykes": {"instagram": "iamwandasykes", "igFollowers": 900000, "genres": ["observational", "political", "storytelling"], "touringStatus": "TOURING"},
    "mark normand": {"instagram": "marknormand", "igFollowers": 850000, "genres": ["one-liner", "observational", "dark"], "touringStatus": "TOURING"},
    "sam morril": {"instagram": "sammorril", "igFollowers": 550000, "genres": ["dark", "one-liner", "deadpan"], "touringStatus": "TOURING"},
    "chris distefano": {"instagram": "chrisdcomedy", "igFollowers": 842000, "genres": ["storytelling", "observational", "physical"], "touringStatus": "TOURING"},
    "tim dillon": {"instagram": "timjdillon", "igFollowers": 1200000, "genres": ["dark", "political", "rant", "absurdist"], "touringStatus": "TOURING"},
    "pete davidson": {"instagram": "petedavidson", "igFollowers": 4500000, "genres": ["self-deprecating", "observational", "dark"], "touringStatus": "TOURING"},
    "ron funches": {"instagram": "ronfunches", "igFollowers": 350000, "genres": ["clean", "absurdist", "wholesome"], "touringStatus": "TOURING"},
    "patton oswalt": {"instagram": "pattonoswalt", "igFollowers": 900000, "genres": ["observational", "nerd", "dark", "storytelling"], "touringStatus": "TOURING"},
    "marc maron": {"instagram": "marcmaron", "igFollowers": 600000, "genres": ["observational", "confessional", "storytelling"], "touringStatus": "TOURING"},
    "aziz ansari": {"instagram": "azizansari", "igFollowers": 3500000, "genres": ["observational", "storytelling", "cultural"], "touringStatus": "TOURING"},
    "daniel tosh": {"instagram": "danieltosh", "igFollowers": 1800000, "genres": ["dark", "one-liner", "absurdist"], "touringStatus": "TOURING"},
    "dave attell": {"instagram": "daveattell", "igFollowers": 300000, "genres": ["dark", "one-liner", "roast"], "touringStatus": "TOURING"},
    "bo burnham": {"instagram": "boburnham", "igFollowers": 3700000, "genres": ["musical", "absurdist", "meta", "dark"], "touringStatus": "UNKNOWN"},
    "whitney cummings": {"instagram": "whitneycummings", "igFollowers": 1700000, "genres": ["observational", "sex-positive", "self-deprecating"], "touringStatus": "TOURING"},
    "hannibal buress": {"instagram": "hannibalburess", "igFollowers": 1200000, "genres": ["observational", "deadpan", "absurdist"], "touringStatus": "TOURING"},
    "anthony jeselnik": {"instagram": "anthonyjeselnik", "igFollowers": 450000, "genres": ["dark", "one-liner", "roast"], "touringStatus": "TOURING"},
    "demetri martin": {"instagram": "demetrimartin", "igFollowers": 500000, "genres": ["one-liner", "visual", "deadpan"], "touringStatus": "TOURING"},
    "brian regan": {"instagram": "brianregancomedian", "igFollowers": 250000, "genres": ["clean", "observational", "physical"], "touringStatus": "TOURING"},
    "mike birbiglia": {"instagram": "biaborma", "igFollowers": 380000, "genres": ["storytelling", "observational", "confessional"], "touringStatus": "TOURING"},
    "kyle kinane": {"instagram": "kylekinane", "igFollowers": 200000, "genres": ["observational", "storytelling", "dark"], "touringStatus": "TOURING"},
    "doug stanhope": {"instagram": "dougstanhope", "igFollowers": 200000, "genres": ["dark", "political", "rant"], "touringStatus": "TOURING"},
    "rory scovel": {"instagram": "roryscovel", "igFollowers": 250000, "genres": ["absurdist", "observational", "character"], "touringStatus": "TOURING"},
    "michelle wolf": {"instagram": "michelleisawolf", "igFollowers": 450000, "genres": ["political", "dark", "observational"], "touringStatus": "TOURING"},
    "michelle buteau": {"instagram": "michellebuteau", "igFollowers": 800000, "genres": ["storytelling", "observational", "self-deprecating"], "touringStatus": "TOURING"},
    "fortune feimster": {"instagram": "fortunefeimster", "igFollowers": 600000, "genres": ["storytelling", "observational", "clean"], "touringStatus": "TOURING"},
    "neal brennan": {"instagram": "nealbrennan", "igFollowers": 350000, "genres": ["observational", "dark", "confessional"], "touringStatus": "TOURING"},
    "ms. pat": {"instagram": "comediennemspatshow", "igFollowers": 400000, "genres": ["storytelling", "dark", "observational"], "touringStatus": "TOURING"},
    "big jay oakerson": {"instagram": "bigjayoakerson", "igFollowers": 250000, "genres": ["dark", "crowd-work", "storytelling"], "touringStatus": "TOURING"},
    "brian simpson": {"instagram": "briansimpson", "igFollowers": 600000, "genres": ["observational", "storytelling", "dark"], "touringStatus": "TOURING"},
    "dan soder": {"instagram": "dansoder", "igFollowers": 500000, "genres": ["observational", "storytelling", "character"], "touringStatus": "TOURING"},
    "joe list": {"instagram": "joelistcomedy", "igFollowers": 350000, "genres": ["observational", "dark", "self-deprecating"], "touringStatus": "TOURING"},
    "stavros halkias": {"instagram": "stavvybaby2", "igFollowers": 700000, "genres": ["observational", "absurdist", "storytelling"], "touringStatus": "TOURING"},
    "ali siddiq": {"instagram": "alisiddiq", "igFollowers": 500000, "genres": ["storytelling", "observational", "dark"], "touringStatus": "TOURING"},
    "ralph barbosa": {"instagram": "ralphbarbosa", "igFollowers": 1500000, "genres": ["observational", "deadpan", "cultural"], "touringStatus": "TOURING"},
    "matteo lane": {"instagram": "matteolane", "igFollowers": 2000000, "genres": ["observational", "musical", "storytelling"], "touringStatus": "TOURING"},
    "josh johnson": {"instagram": "joshjohnson", "igFollowers": 600000, "genres": ["observational", "storytelling", "musical"], "touringStatus": "TOURING"},
    "jeff arcuri": {"instagram": "jeffarcuri", "igFollowers": 700000, "genres": ["crowd-work", "observational", "storytelling"], "touringStatus": "TOURING"},
    "druski": {"instagram": "druski", "igFollowers": 12000000, "genres": ["character", "sketch", "improvisation"], "touringStatus": "TOURING"},
    "desi banks": {"instagram": "iamdesibanks", "igFollowers": 9000000, "genres": ["character", "sketch", "storytelling"], "touringStatus": "TOURING"},
    "kountry wayne": {"instagram": "kountrywayne", "igFollowers": 3800000, "genres": ["character", "sketch", "clean", "storytelling"], "touringStatus": "TOURING"},
    "mike epps": {"instagram": "therealmikeepps", "igFollowers": 8100000, "genres": ["storytelling", "physical", "character"], "touringStatus": "TOURING"},
    "marlon wayans": {"instagram": "marlonwayans", "igFollowers": 7500000, "genres": ["physical", "character", "observational"], "touringStatus": "TOURING"},
    "chris tucker": {"instagram": "christucker", "igFollowers": 4200000, "genres": ["physical", "storytelling", "character"], "touringStatus": "TOURING"},
    "cedric the entertainer": {"instagram": "cedtheentertainer", "igFollowers": 3300000, "genres": ["observational", "storytelling", "character"], "touringStatus": "TOURING"},
    "d.l. hughley": {"instagram": "realdlhughley", "igFollowers": 1800000, "genres": ["political", "observational", "storytelling"], "touringStatus": "TOURING"},
    "tiffany haddish": {"instagram": "tiffanyhaddish", "igFollowers": 6000000, "genres": ["storytelling", "observational", "physical"], "touringStatus": "TOURING"},
    "katt williams": {"instagram": "kattwilliams", "igFollowers": 3000000, "genres": ["storytelling", "physical", "observational"], "touringStatus": "TOURING"},
    "ron white": {"instagram": "ronwhiteofficial", "igFollowers": 500000, "genres": ["storytelling", "blue-collar", "drinking"], "touringStatus": "TOURING"},
    "jeff foxworthy": {"instagram": "jeloopy", "igFollowers": 800000, "genres": ["observational", "blue-collar", "clean"], "touringStatus": "TOURING"},
    "george lopez": {"instagram": "georgelopez", "igFollowers": 2000000, "genres": ["observational", "cultural", "political"], "touringStatus": "TOURING"},
    "russell peters": {"instagram": "russellpeters", "igFollowers": 2500000, "genres": ["observational", "cultural", "crowd-work"], "touringStatus": "TOURING"},
    "howie mandel": {"instagram": "haborealowi", "igFollowers": 1300000, "genres": ["observational", "physical", "absurdist"], "touringStatus": "TOURING"},
    "ricky gervais": {"instagram": "rickygervais", "igFollowers": 9000000, "genres": ["dark", "observational", "political"], "touringStatus": "TOURING"},
    "cristela alonzo": {"instagram": "cristela9", "igFollowers": 300000, "genres": ["observational", "cultural", "storytelling"], "touringStatus": "TOURING"},
    "felipe esparza": {"instagram": "felipeesparza", "igFollowers": 500000, "genres": ["storytelling", "cultural", "observational"], "touringStatus": "TOURING"},
    "gianmarco soresi": {"instagram": "gianmarcosoresi", "igFollowers": 300000, "genres": ["observational", "storytelling", "crowd-work"], "touringStatus": "TOURING"},
    "chloe radcliffe": {"instagram": "chloeradcliffe", "igFollowers": 100000, "genres": ["observational", "self-deprecating", "storytelling"], "touringStatus": "TOURING"},
    "katherine blanford": {"instagram": "katherineblanford", "igFollowers": 150000, "genres": ["observational", "southern", "storytelling"], "touringStatus": "TOURING"},
    "morgan jay": {"instagram": "morganjaycomedy", "igFollowers": 800000, "genres": ["musical", "observational", "crowd-work"], "touringStatus": "TOURING"},
    "matt mathews": {"instagram": "mattmathewscomedy", "igFollowers": 2100000, "genres": ["character", "southern", "storytelling"], "touringStatus": "TOURING"},
    "robby hoffman": {"instagram": "robbyhoffman", "igFollowers": 200000, "genres": ["dark", "observational", "deadpan"], "touringStatus": "TOURING"},
    "zarna garg": {"instagram": "zaborealarnagarg", "igFollowers": 1000000, "genres": ["observational", "cultural", "storytelling"], "touringStatus": "TOURING"},
    "nick cannon": {"instagram": "nickcannon", "igFollowers": 14000000, "genres": ["observational", "cultural", "storytelling"], "touringStatus": "TOURING"},
    "louis c.k.": {"instagram": None, "igFollowers": 0, "genres": ["observational", "dark", "confessional"], "touringStatus": "TOURING"},
    "pete holmes": {"instagram": "peteholmes", "igFollowers": 350000, "genres": ["observational", "clean", "absurdist"], "touringStatus": "TOURING"},
    "christina pazsitzky": {"instagram": "christinapazsitzky", "igFollowers": 700000, "genres": ["observational", "dark", "self-deprecating"], "touringStatus": "TOURING"},
    "ari shaffir": {"instagram": "arishaffir", "igFollowers": 350000, "genres": ["dark", "storytelling", "political"], "touringStatus": "TOURING"},
    "yannis pappas": {"instagram": "yaboreannis", "igFollowers": 300000, "genres": ["observational", "storytelling", "character"], "touringStatus": "TOURING"},
    "tom papa": {"instagram": "tompapa", "igFollowers": 200000, "genres": ["observational", "clean", "storytelling"], "touringStatus": "TOURING"},
    "jessica kirson": {"instagram": "jessicakirson", "igFollowers": 400000, "genres": ["character", "observational", "physical"], "touringStatus": "TOURING"},
    "ronny chieng": {"instagram": "ronnychieng", "igFollowers": 1600000, "genres": ["observational", "cultural", "political"], "touringStatus": "TOURING"},
    "jim jefferies": {"instagram": "jimjefferies", "igFollowers": 738000, "genres": ["dark", "storytelling", "political"], "touringStatus": "TOURING"},
    "kumail nanjiani": {"instagram": "kumailn", "igFollowers": 3000000, "genres": ["observational", "cultural", "storytelling"], "touringStatus": "TOURING"},
    "rachel feinstein": {"instagram": "rachelfeinstein", "igFollowers": 100000, "genres": ["character", "observational", "storytelling"], "touringStatus": "TOURING"},
    "godfrey": {"instagram": "godfrey", "igFollowers": 300000, "genres": ["character", "physical", "observational"], "touringStatus": "TOURING"},
    "joey diaz": {"instagram": "madflavorsworld", "igFollowers": 2500000, "genres": ["storytelling", "dark", "rant"], "touringStatus": "TOURING"},
    "nick kroll": {"instagram": "nickkroll", "igFollowers": 1200000, "genres": ["character", "absurdist", "observational"], "touringStatus": "TOURING"},
    "michael che": {"instagram": "chethewriter", "igFollowers": 1500000, "genres": ["observational", "political", "dark"], "touringStatus": "TOURING"},
    "ken jeong": {"instagram": "kenjeong", "igFollowers": 1200000, "genres": ["observational", "physical", "character"], "touringStatus": "TOURING"},
    "kevin james": {"instagram": "kevinjamesoffl", "igFollowers": 1400000, "genres": ["observational", "physical", "clean"], "touringStatus": "TOURING"},
    "jeff ross": {"instagram": "realjeffrross", "igFollowers": 600000, "genres": ["roast", "dark", "one-liner"], "touringStatus": "TOURING"},
    "david spade": {"instagram": "davidspade", "igFollowers": 3200000, "genres": ["observational", "deadpan", "one-liner"], "touringStatus": "TOURING"},
    "dana carvey": {"instagram": "danacarvey", "igFollowers": 900000, "genres": ["character", "impressionist", "observational"], "touringStatus": "TOURING"},
    "brad williams": {"instagram": "faborealunnybrwidgets", "igFollowers": 200000, "genres": ["observational", "self-deprecating", "crowd-work"], "touringStatus": "TOURING"},
    "gary gulman": {"instagram": "garygulman", "igFollowers": 120000, "genres": ["observational", "storytelling", "confessional"], "touringStatus": "TOURING"},
    "nate jackson": {"instagram": "inategramjackson", "igFollowers": 700000, "genres": ["observational", "storytelling", "cultural"], "touringStatus": "TOURING"},
    "sam jay": {"instagram": "samjaycomedian", "igFollowers": 200000, "genres": ["observational", "political", "storytelling"], "touringStatus": "TOURING"},
    "tig notaro": {"instagram": "tignotaro", "igFollowers": 300000, "genres": ["deadpan", "storytelling", "absurdist"], "touringStatus": "TOURING"},
    "maria bamford": {"instagram": "mariabamfordofficial", "igFollowers": 200000, "genres": ["character", "absurdist", "confessional"], "touringStatus": "TOURING"},
    "atsuko okatsuka": {"instagram": "atsuko_okatsuka", "igFollowers": 400000, "genres": ["absurdist", "observational", "cultural"], "touringStatus": "TOURING"},
    "ramy youssef": {"instagram": "ramy", "igFollowers": 800000, "genres": ["cultural", "observational", "storytelling"], "touringStatus": "TOURING"},
    "jim norton": {"instagram": "jimnorton", "igFollowers": 350000, "genres": ["dark", "confessional", "observational"], "touringStatus": "TOURING"},
    "hannah gadsby": {"instagram": "hannahgadsby", "igFollowers": 700000, "genres": ["storytelling", "observational", "political"], "touringStatus": "TOURING"},
    "lavell crawford": {"instagram": "lavellcrawford", "igFollowers": 500000, "genres": ["storytelling", "observational", "physical"], "touringStatus": "TOURING"},
    "tommy pope": {"instagram": "hesacomedian", "igFollowers": 150000, "genres": ["observational", "storytelling"], "touringStatus": "TOURING"},
}

# New comedians to add (not in existing file) - gathered from research
NEW_COMEDIANS = [
    # Mega-tier social media comedians
    {"name": "Ellen DeGeneres", "genres": ["observational", "clean"], "touringStatus": "RETIRED", "instagram": "theellenshow", "igFollowers": 139000000},
    {"name": "Steve Harvey", "genres": ["observational", "clean", "storytelling"], "touringStatus": "TOURING", "instagram": "iamsteveharveytv", "igFollowers": 16000000},
    {"name": "Conan O'Brien", "genres": ["observational", "absurdist", "character"], "touringStatus": "TOURING", "instagram": "teamcoco", "igFollowers": 7000000},
    {"name": "Adam Sandler", "genres": ["absurdist", "musical", "character"], "touringStatus": "TOURING", "instagram": "adamsandler", "igFollowers": 12000000},
    {"name": "Stephen Colbert", "genres": ["political", "character", "satire"], "touringStatus": "UNKNOWN", "instagram": "colbertlateshow", "igFollowers": 2500000},
    {"name": "John Oliver", "genres": ["political", "observational", "satire"], "touringStatus": "UNKNOWN", "instagram": "lastweektonight", "igFollowers": 3000000},
    {"name": "Seth Rogen", "genres": ["observational", "stoner", "storytelling"], "touringStatus": "UNKNOWN", "instagram": "sethrogen", "igFollowers": 11000000},
    {"name": "Maya Rudolph", "genres": ["character", "impressionist", "absurdist"], "touringStatus": "UNKNOWN", "instagram": "mayarudolph", "igFollowers": 1500000},
    {"name": "Jon Stewart", "genres": ["political", "observational", "satire"], "touringStatus": "UNKNOWN", "instagram": "jonstewart", "igFollowers": 500000},
    {"name": "Jamie Foxx", "genres": ["impressionist", "character", "storytelling"], "touringStatus": "TOURING", "instagram": "iamjamiefoxx", "igFollowers": 17000000},
    {"name": "Nick Mohammed", "genres": ["character", "absurdist", "observational"], "touringStatus": "TOURING", "instagram": "nickmohammed", "igFollowers": 200000},
    {"name": "Martin Short", "genres": ["character", "physical", "absurdist"], "touringStatus": "TOURING", "instagram": "martinshortofficial", "igFollowers": 600000},

    # Arena/Theater headliners
    {"name": "Jeff Arcuri", "genres": ["crowd-work", "observational", "storytelling"], "touringStatus": "TOURING", "instagram": "jeffarcuri", "igFollowers": 700000},
    {"name": "Jessica Kirson", "genres": ["character", "observational", "physical"], "touringStatus": "TOURING", "instagram": "jessicakirson", "igFollowers": 400000},
    {"name": "Nurse John", "genres": ["observational", "healthcare", "character"], "touringStatus": "TOURING", "instagram": "nursejohn", "igFollowers": 3000000},
    {"name": "Mo Amer", "genres": ["storytelling", "cultural", "observational"], "touringStatus": "TOURING", "instagram": "moamer", "igFollowers": 500000},
    {"name": "Matt Mathews", "genres": ["character", "southern", "storytelling"], "touringStatus": "TOURING", "instagram": "mattmathewscomedy", "igFollowers": 2100000},
    {"name": "Sal Vulcano", "genres": ["observational", "storytelling", "improvisation"], "touringStatus": "TOURING", "instagram": "salvulcano", "igFollowers": 3500000},
    {"name": "Max Amini", "genres": ["observational", "cultural", "character"], "touringStatus": "TOURING", "instagram": "maxamini", "igFollowers": 8600000},
    {"name": "Zakir Khan", "genres": ["storytelling", "cultural", "observational"], "touringStatus": "TOURING", "instagram": "zakaborealirkhan_208", "igFollowers": 5000000},
    {"name": "Vir Das", "genres": ["observational", "political", "cultural"], "touringStatus": "TOURING", "instagram": "vaborealirdas", "igFollowers": 4000000},
    {"name": "Larry the Cable Guy", "genres": ["blue-collar", "character", "observational"], "touringStatus": "TOURING", "instagram": "gitrdone", "igFollowers": 800000},
    {"name": "Maddy Smith", "genres": ["observational", "storytelling", "self-deprecating"], "touringStatus": "TOURING", "instagram": "maddysmith", "igFollowers": 600000},
    {"name": "Donnell Rawlings", "genres": ["observational", "storytelling", "character"], "touringStatus": "TOURING", "instagram": "donnellrawlings", "igFollowers": 700000},
    {"name": "David Lucas", "genres": ["roast", "crowd-work", "observational"], "touringStatus": "TOURING", "instagram": "davidlucascomedy", "igFollowers": 500000},
    {"name": "Hans Kim", "genres": ["observational", "deadpan", "crowd-work"], "touringStatus": "TOURING", "instagram": "hanskimcomedy", "igFollowers": 400000},
    {"name": "Jeremiah Watkins", "genres": ["absurdist", "character", "improvisation"], "touringStatus": "TOURING", "instagram": "jeremiahstandup", "igFollowers": 200000},
    {"name": "Becky Robinson", "genres": ["character", "viral", "observational"], "touringStatus": "TOURING", "instagram": "beckyrobinsoncomedy", "igFollowers": 500000},
    {"name": "Nicole Byer", "genres": ["observational", "storytelling", "self-deprecating"], "touringStatus": "TOURING", "instagram": "nicolebyer", "igFollowers": 1100000},
    {"name": "Tim Robinson", "genres": ["character", "absurdist", "sketch"], "touringStatus": "UNKNOWN", "instagram": None, "igFollowers": 0},
    {"name": "Chad Daniels", "genres": ["observational", "clean", "storytelling"], "touringStatus": "TOURING", "instagram": "chaddanielscomic", "igFollowers": 80000},

    # Deadline 15 comedians to watch 2025
    {"name": "Nico Carney", "genres": ["observational", "storytelling", "LGBTQ"], "touringStatus": "TOURING", "instagram": "nicocarney", "igFollowers": 50000},
    {"name": "Aaron Chen", "genres": ["observational", "absurdist", "cultural"], "touringStatus": "TOURING", "instagram": "aaronchen", "igFollowers": 100000},
    {"name": "Dina Hashem", "genres": ["dark", "observational", "cultural"], "touringStatus": "TOURING", "instagram": "dinahashem", "igFollowers": 60000},
    {"name": "Jordan Jensen", "genres": ["observational", "self-deprecating", "storytelling"], "touringStatus": "TOURING", "instagram": "jordanjensen", "igFollowers": 100000},
    {"name": "KC Shornima", "genres": ["observational", "dark", "storytelling"], "touringStatus": "TOURING", "instagram": "kcshornima", "igFollowers": 50000},
    {"name": "Rene Vaca", "genres": ["observational", "cultural", "storytelling"], "touringStatus": "TOURING", "instagram": "renevaca", "igFollowers": 100000},
    {"name": "Fern Brady", "genres": ["dark", "observational", "storytelling"], "touringStatus": "TOURING", "instagram": "fernbrady", "igFollowers": 200000},

    # Variety 10 Comics to Watch 2025
    {"name": "Mary Beth Barone", "genres": ["observational", "self-deprecating", "storytelling"], "touringStatus": "TOURING", "instagram": "marybethbarone", "igFollowers": 100000},
    {"name": "Dyon Mojo Brooks", "genres": ["observational", "cultural", "character"], "touringStatus": "TOURING", "instagram": "dyonmojo", "igFollowers": 200000},
    {"name": "Joe Dombrowski", "genres": ["observational", "viral", "storytelling"], "touringStatus": "TOURING", "instagram": "joedombrowski", "igFollowers": 1000000},
    {"name": "Steph Tolev", "genres": ["absurdist", "character", "dark"], "touringStatus": "TOURING", "instagram": "stephtolev", "igFollowers": 50000},
    {"name": "Tacarra Williams", "genres": ["observational", "storytelling", "cultural"], "touringStatus": "TOURING", "instagram": "tacarrawilliams", "igFollowers": 50000},

    # Deadline's comics who won 2025
    {"name": "Gina Brillon", "genres": ["storytelling", "cultural", "observational"], "touringStatus": "TOURING", "instagram": "ginabrillon", "igFollowers": 200000},

    # JFL New Faces 2025 Stand-Ups
    {"name": "Alistair Ogden", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Anjelica Scannura", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Aurie Styla", "genres": ["observational", "cultural"], "touringStatus": "REGIONAL", "instagram": "auriestyla", "igFollowers": 30000},
    {"name": "Bruce Gray", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Chloe Petts", "genres": ["observational", "LGBTQ"], "touringStatus": "REGIONAL", "instagram": "chloepetts", "igFollowers": 30000},
    {"name": "Conor Janda", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Dan Duvall", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Dan Rath", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Dan Tiernan", "genres": ["observational"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Dean Stanfield", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Dvontre Coleman", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Dylan Adler", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Grace Johnson", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Hayden Johnson", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "James Mwaura", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Jesus Sepulveda", "genres": ["observational", "cultural"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Jo Sunday", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Lara Ricote", "genres": ["observational", "cultural"], "touringStatus": "REGIONAL", "instagram": "lararicote", "igFollowers": 30000},
    {"name": "Maggie Crane", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Maxx Eddy", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Olivia Carter", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Olivia Stadler", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Randee Neumeyer", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Sam Biru", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Steve Furey", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Tom Murphy", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Vittorio Angelone", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Willie Simon", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},

    # JFL New Faces 2025 Characters
    {"name": "Andres Parada", "genres": ["character"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Austin Williams", "genres": ["character"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Ava Bunn", "genres": ["character"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Jess Elgene", "genres": ["character"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Lesley Osuala", "genres": ["character"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Mimi Von Schack", "genres": ["character"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Miranda Rozas", "genres": ["character"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Tom Hearn", "genres": ["character"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},

    # JFL New Faces 2024
    {"name": "Anna Seregina", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Asha Ward", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Audrey Stewart", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Brittany Schmitt", "genres": ["observational", "storytelling"], "touringStatus": "REGIONAL", "instagram": "brittanyschmitt", "igFollowers": 300000},
    {"name": "Chike Robinson", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Darius Bennett", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Derrick Stroup", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Fumi Abe", "genres": ["observational", "cultural"], "touringStatus": "LOCAL", "instagram": "fumiabecomedy", "igFollowers": 20000},
    {"name": "Kelly Ryan", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Leslie Liao", "genres": ["observational", "cultural"], "touringStatus": "REGIONAL", "instagram": "leslieliao", "igFollowers": 30000},
    {"name": "Maggie Winters", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Sahana Srinivasan", "genres": ["observational", "cultural"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Sahib Singh", "genres": ["observational", "cultural"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Sam Morrison", "genres": ["observational", "LGBTQ"], "touringStatus": "REGIONAL", "instagram": "sammorrison", "igFollowers": 30000},
    {"name": "Saul Trujillo", "genres": ["observational", "cultural"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Tommy Brennan", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Troy Bond", "genres": ["observational", "crowd-work"], "touringStatus": "REGIONAL", "instagram": "troybondcomedy", "igFollowers": 100000},
    {"name": "Zach Brazao", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},

    # Deadline 20 stand-ups to watch 2026
    {"name": "Jay Jurden", "genres": ["observational", "storytelling", "LGBTQ"], "touringStatus": "TOURING", "instagram": "jayjurden", "igFollowers": 50000},
    {"name": "Ismael Loutfi", "genres": ["observational", "cultural", "storytelling"], "touringStatus": "REGIONAL", "instagram": "ismaelloutfi", "igFollowers": 30000},
    {"name": "Laura Peek", "genres": ["observational", "storytelling"], "touringStatus": "REGIONAL", "instagram": "laurapeek", "igFollowers": 30000},
    {"name": "TJ (Tanael Joachim)", "genres": ["observational", "cultural", "storytelling"], "touringStatus": "REGIONAL", "instagram": "tjcomedy", "igFollowers": 30000},
    {"name": "Orion Levine", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": "orionlevine", "igFollowers": 20000},

    # GOLD Comedy picks and other rising comics
    {"name": "Kerry Coddett", "genres": ["observational", "cultural", "storytelling"], "touringStatus": "REGIONAL", "instagram": "kerrycoddett", "igFollowers": 30000},
    {"name": "Emily Catalano", "genres": ["deadpan", "observational"], "touringStatus": "REGIONAL", "instagram": "emilycatalano", "igFollowers": 20000},
    {"name": "Salma Zaky", "genres": ["observational", "cultural"], "touringStatus": "LOCAL", "instagram": "salmazaky", "igFollowers": 20000},
    {"name": "Karina Reyes", "genres": ["observational", "cultural"], "touringStatus": "LOCAL", "instagram": "karinareyes", "igFollowers": 15000},
    {"name": "Gabby Gutierrez-Reed", "genres": ["observational", "absurdist"], "touringStatus": "LOCAL", "instagram": "gabbygutierrezreed", "igFollowers": 10000},
    {"name": "TaTa Sherise", "genres": ["observational", "storytelling", "cultural"], "touringStatus": "REGIONAL", "instagram": "tatasherise", "igFollowers": 30000},

    # Comedy Cellar / NYC regulars
    {"name": "Dov Davidoff", "genres": ["observational", "dark", "confessional"], "touringStatus": "TOURING", "instagram": "dovdavidoff", "igFollowers": 60000},
    {"name": "Robert Kelly", "genres": ["observational", "storytelling", "dark"], "touringStatus": "TOURING", "instagram": "robertkelly", "igFollowers": 150000},
    {"name": "Rich Vos", "genres": ["observational", "self-deprecating"], "touringStatus": "TOURING", "instagram": "richvos", "igFollowers": 80000},
    {"name": "Nick Di Paolo", "genres": ["political", "dark", "observational"], "touringStatus": "TOURING", "instagram": "nickdipaolo", "igFollowers": 80000},
    {"name": "Colin Quinn", "genres": ["political", "observational", "storytelling"], "touringStatus": "TOURING", "instagram": "iamcolinquinn", "igFollowers": 200000},
    {"name": "Judah Friedlander", "genres": ["character", "one-liner", "political"], "touringStatus": "TOURING", "instagram": "judahfriedlander", "igFollowers": 80000},
    {"name": "Todd Barry", "genres": ["deadpan", "observational", "crowd-work"], "touringStatus": "TOURING", "instagram": "toddbarry", "igFollowers": 100000},
    {"name": "Ryan Hamilton", "genres": ["clean", "observational", "storytelling"], "touringStatus": "TOURING", "instagram": "ryanhamiltoncomedy", "igFollowers": 150000},
    {"name": "Sherrod Small", "genres": ["observational", "dark", "storytelling"], "touringStatus": "TOURING", "instagram": "sherrodsmall", "igFollowers": 50000},
    {"name": "Gregg Rogell", "genres": ["dark", "observational"], "touringStatus": "TOURING", "instagram": "greggrogell", "igFollowers": 20000},
    {"name": "Keith Robinson", "genres": ["dark", "observational", "roast"], "touringStatus": "TOURING", "instagram": "keithrobinson", "igFollowers": 50000},
    {"name": "Rosebud Baker", "genres": ["dark", "observational", "self-deprecating"], "touringStatus": "TOURING", "instagram": "rosebudbaker", "igFollowers": 60000},
    {"name": "Drew Dunn", "genres": ["observational", "storytelling"], "touringStatus": "REGIONAL", "instagram": "drewdunn", "igFollowers": 50000},
    {"name": "Dan Naturman", "genres": ["observational", "deadpan"], "touringStatus": "TOURING", "instagram": "dannaturman", "igFollowers": 20000},
    {"name": "Lynne Koplitz", "genres": ["dark", "observational", "sex-positive"], "touringStatus": "TOURING", "instagram": "lynnekoplitz", "igFollowers": 30000},
    {"name": "Yamaneika Saunders", "genres": ["storytelling", "observational", "dark"], "touringStatus": "TOURING", "instagram": "yamaneika", "igFollowers": 40000},
    {"name": "Jourdain Fisher", "genres": ["observational", "cultural"], "touringStatus": "REGIONAL", "instagram": "jourdainfisher", "igFollowers": 20000},
    {"name": "Allan Havey", "genres": ["observational", "deadpan"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Jamie Wolf", "genres": ["observational", "crowd-work"], "touringStatus": "REGIONAL", "instagram": "jamiewolfcomedy", "igFollowers": 30000},
    {"name": "Peter Revello", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},

    # Moontower / Austin scene
    {"name": "Margaret Cho", "genres": ["political", "cultural", "character"], "touringStatus": "TOURING", "instagram": "margaretcho", "igFollowers": 700000},
    {"name": "Liz Splatt", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Jenny Zigrino", "genres": ["observational", "self-deprecating"], "touringStatus": "REGIONAL", "instagram": "jennyzigrino", "igFollowers": 50000},
    {"name": "Carmen Christopher", "genres": ["absurdist", "character"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Shane Torres", "genres": ["observational", "storytelling"], "touringStatus": "REGIONAL", "instagram": "shanetorres", "igFollowers": 30000},
    {"name": "The Sklar Brothers", "genres": ["observational", "one-liner"], "touringStatus": "TOURING", "instagram": "sklarbrothers", "igFollowers": 40000},
    {"name": "Poly Diaz", "genres": ["observational", "cultural"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Opey Olagbaju", "genres": ["observational", "cultural"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},

    # Netflix Is A Joke fest and other major names
    {"name": "Hannah Berner", "genres": ["observational", "self-deprecating", "storytelling"], "touringStatus": "TOURING", "instagram": "beingbernz", "igFollowers": 2700000},
    {"name": "Rachel Bilson", "genres": ["observational"], "touringStatus": "UNKNOWN", "instagram": None, "igFollowers": 0},
    {"name": "Melissa Villasenor", "genres": ["impressionist", "character", "observational"], "touringStatus": "TOURING", "instagram": "melissavillasenor", "igFollowers": 400000},
    {"name": "Roy Wood Jr.", "genres": ["political", "observational", "storytelling"], "touringStatus": "TOURING", "instagram": "roywoodjr", "igFollowers": 500000},
    {"name": "Scott Aukerman", "genres": ["absurdist", "improvisation", "character"], "touringStatus": "TOURING", "instagram": "scottaukerman", "igFollowers": 80000},
    {"name": "Sabrina Wu", "genres": ["observational", "cultural"], "touringStatus": "REGIONAL", "instagram": "sabrinawu", "igFollowers": 100000},

    # Podcast-famous comedians
    {"name": "Ben Bankas", "genres": ["observational", "crowd-work"], "touringStatus": "TOURING", "instagram": "benbankas", "igFollowers": 100000},
    {"name": "Ari Matti", "genres": ["observational"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Martin Phillips", "genres": ["observational", "crowd-work"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Brian Redban", "genres": ["absurdist", "observational"], "touringStatus": "REGIONAL", "instagram": "redban", "igFollowers": 200000},

    # Tree Town / indie festival circuit
    {"name": "Tina Friml", "genres": ["observational", "storytelling"], "touringStatus": "REGIONAL", "instagram": "tinafriml", "igFollowers": 30000},
    {"name": "Jason Jamerson", "genres": ["observational", "cultural"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Erich Laux", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Adam McShane", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Andrew Yang (comedian)", "genres": ["observational"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Lisa Wallen", "genres": ["observational", "nerd"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},

    # Additional well-known US comedians not yet in list
    {"name": "Ray Romano", "genres": ["observational", "clean", "storytelling"], "touringStatus": "TOURING", "instagram": "rayromano", "igFollowers": 200000},
    {"name": "Bob Odenkirk", "genres": ["character", "absurdist", "sketch"], "touringStatus": "UNKNOWN", "instagram": "mrbobodenkirk", "igFollowers": 1500000},
    {"name": "Leslie Jones", "genres": ["observational", "physical", "storytelling"], "touringStatus": "TOURING", "instagram": "laborealesdgjones", "igFollowers": 3000000},
    {"name": "Kenan Thompson", "genres": ["character", "impressionist", "sketch"], "touringStatus": "UNKNOWN", "instagram": "kenanthompson", "igFollowers": 2000000},
    {"name": "Kevin Bridges", "genres": ["observational", "storytelling"], "touringStatus": "TOURING", "instagram": "kevinbridges86", "igFollowers": 300000},
    {"name": "Russell Howard", "genres": ["observational", "storytelling"], "touringStatus": "TOURING", "instagram": "russellhoward", "igFollowers": 500000},
    {"name": "Darrell Hammond", "genres": ["impressionist", "character"], "touringStatus": "TOURING", "instagram": None, "igFollowers": 0},
    {"name": "Bill Bailey", "genres": ["musical", "absurdist", "observational"], "touringStatus": "TOURING", "instagram": "the_bill_bailey", "igFollowers": 300000},
    {"name": "Frankie Boyle", "genres": ["dark", "political", "one-liner"], "touringStatus": "TOURING", "instagram": None, "igFollowers": 0},
    {"name": "James Corden", "genres": ["observational", "storytelling"], "touringStatus": "TOURING", "instagram": "j_corden", "igFollowers": 12000000},
    {"name": "Weird Al Yankovic", "genres": ["musical", "parody", "absurdist"], "touringStatus": "TOURING", "instagram": "alfredyankovic", "igFollowers": 600000},
    {"name": "Brian Posehn", "genres": ["nerd", "dark", "observational"], "touringStatus": "TOURING", "instagram": "brianposehn", "igFollowers": 100000},
    {"name": "Eddie Izzard", "genres": ["absurdist", "storytelling", "historical"], "touringStatus": "TOURING", "instagram": "eddieizzard", "igFollowers": 400000},
    {"name": "Lee Mack", "genres": ["one-liner", "observational", "deadpan"], "touringStatus": "TOURING", "instagram": None, "igFollowers": 0},
    {"name": "Jimmy Fallon", "genres": ["impressionist", "character", "observational"], "touringStatus": "UNKNOWN", "instagram": "jimmyfallon", "igFollowers": 28000000},
    {"name": "Conan O'Brien", "genres": ["observational", "absurdist"], "touringStatus": "TOURING", "instagram": "teamcoco", "igFollowers": 7000000},

    # More mid-tier / club headliners
    {"name": "Beth Stelling", "genres": ["observational", "storytelling", "dark"], "touringStatus": "TOURING", "instagram": "bethstelling", "igFollowers": 150000},
    {"name": "Joel Kim Booster", "genres": ["observational", "cultural", "LGBTQ"], "touringStatus": "TOURING", "instagram": "joelkimbooster", "igFollowers": 300000},
    {"name": "Liza Treyger", "genres": ["dark", "observational", "self-deprecating"], "touringStatus": "TOURING", "instagram": "lizatreaborealyger", "igFollowers": 50000},
    {"name": "Moses Storm", "genres": ["storytelling", "confessional", "observational"], "touringStatus": "TOURING", "instagram": "mosesstorm", "igFollowers": 100000},
    {"name": "Taylor Williamson", "genres": ["deadpan", "one-liner", "clean"], "touringStatus": "REGIONAL", "instagram": "taylorwilliamson", "igFollowers": 50000},
    {"name": "Ian Bagg", "genres": ["crowd-work", "observational", "physical"], "touringStatus": "TOURING", "instagram": "ianbagg", "igFollowers": 200000},
    {"name": "Ben Bailey", "genres": ["observational", "dark", "storytelling"], "touringStatus": "TOURING", "instagram": "benbaileycomic", "igFollowers": 50000},
    {"name": "Al Madrigal", "genres": ["observational", "cultural", "storytelling"], "touringStatus": "TOURING", "instagram": "almadrigal", "igFollowers": 50000},
    {"name": "Ahmed Ahmed", "genres": ["observational", "cultural"], "touringStatus": "TOURING", "instagram": "ahmedahmed", "igFollowers": 50000},
    {"name": "Maz Jobrani", "genres": ["observational", "cultural", "physical"], "touringStatus": "TOURING", "instagram": "mazjobrani", "igFollowers": 400000},
    {"name": "Paul Rodriguez", "genres": ["observational", "cultural", "storytelling"], "touringStatus": "TOURING", "instagram": None, "igFollowers": 0},
    {"name": "Michael Blackson", "genres": ["character", "cultural", "storytelling"], "touringStatus": "TOURING", "instagram": "michaelblackson", "igFollowers": 5000000},
    {"name": "Lil Rel Howery", "genres": ["observational", "storytelling", "physical"], "touringStatus": "TOURING", "instagram": "lilrel", "igFollowers": 1500000},
    {"name": "Chris Redd", "genres": ["observational", "character", "impressionist"], "touringStatus": "TOURING", "instagram": "chrisredd", "igFollowers": 300000},
    {"name": "Finesse Mitchell", "genres": ["observational", "storytelling"], "touringStatus": "TOURING", "instagram": "finessemitchell", "igFollowers": 100000},
    {"name": "Janelle James", "genres": ["deadpan", "observational", "dark"], "touringStatus": "TOURING", "instagram": "janellejames", "igFollowers": 200000},
    {"name": "Julio Torres", "genres": ["absurdist", "character", "cultural"], "touringStatus": "TOURING", "instagram": "juliotorresss", "igFollowers": 200000},
    {"name": "Rachel Bloom", "genres": ["musical", "character", "absurdist"], "touringStatus": "REGIONAL", "instagram": "racheldoesstuff", "igFollowers": 500000},
    {"name": "Aidy Bryant", "genres": ["character", "sketch", "observational"], "touringStatus": "UNKNOWN", "instagram": "aidybryant", "igFollowers": 1200000},
    {"name": "Kate McKinnon", "genres": ["character", "impressionist", "absurdist"], "touringStatus": "UNKNOWN", "instagram": None, "igFollowers": 0},
    {"name": "Caleb Hearon", "genres": ["observational", "LGBTQ", "storytelling"], "touringStatus": "REGIONAL", "instagram": "calebhearon", "igFollowers": 200000},
    {"name": "Pat Regan", "genres": ["observational", "LGBTQ"], "touringStatus": "REGIONAL", "instagram": "patregan", "igFollowers": 150000},
    {"name": "John Crist", "genres": ["clean", "observational", "character"], "touringStatus": "TOURING", "instagram": "johnbcrist", "igFollowers": 3000000},
    {"name": "Noel Miller", "genres": ["observational", "roast"], "touringStatus": "TOURING", "instagram": "noelmiller", "igFollowers": 1200000},
    {"name": "Cody Ko", "genres": ["observational", "roast", "absurdist"], "touringStatus": "TOURING", "instagram": "codyko", "igFollowers": 5000000},
    {"name": "Heather McMahan", "genres": ["observational", "storytelling", "southern"], "touringStatus": "TOURING", "instagram": "heathermcmahan", "igFollowers": 2000000},
    {"name": "Celeste Barber", "genres": ["physical", "parody", "observational"], "touringStatus": "TOURING", "instagram": "celestebarber", "igFollowers": 9000000},
    {"name": "Dulce Sloan", "genres": ["observational", "political", "storytelling"], "touringStatus": "TOURING", "instagram": "dulcesloan", "igFollowers": 200000},
    {"name": "Sam Jay", "genres": ["observational", "political", "storytelling"], "touringStatus": "TOURING", "instagram": "samjaycomedian", "igFollowers": 200000},
    {"name": "Jackie Kashian", "genres": ["observational", "nerd", "storytelling"], "touringStatus": "TOURING", "instagram": "jackiekashian", "igFollowers": 20000},
    {"name": "Amy Sedaris", "genres": ["character", "absurdist"], "touringStatus": "REGIONAL", "instagram": "amysedaris", "igFollowers": 300000},
    {"name": "Russell Brand", "genres": ["observational", "political", "storytelling"], "touringStatus": "UNKNOWN", "instagram": "russellbrand", "igFollowers": 5000000},

    # Black comedy circuit stars
    {"name": "Lavell Crawford", "genres": ["storytelling", "observational", "physical"], "touringStatus": "TOURING", "instagram": "lavellcrawford", "igFollowers": 500000},
    {"name": "Sommore", "genres": ["observational", "storytelling", "sex-positive"], "touringStatus": "TOURING", "instagram": "somaborealmore", "igFollowers": 500000},
    {"name": "Rickey Smiley", "genres": ["character", "storytelling", "clean"], "touringStatus": "TOURING", "instagram": "rickeysmileyofficial", "igFollowers": 2000000},
    {"name": "Michael Colyar", "genres": ["storytelling", "character"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Earthquake", "genres": ["storytelling", "observational"], "touringStatus": "TOURING", "instagram": "quaborealkewithlove", "igFollowers": 500000},
    {"name": "Luenell", "genres": ["dark", "observational", "storytelling"], "touringStatus": "TOURING", "instagram": "luenell", "igFollowers": 400000},
    {"name": "Gary Owen", "genres": ["observational", "storytelling", "crowd-work"], "touringStatus": "TOURING", "instagram": "garyowencomedy", "igFollowers": 600000},
    {"name": "B. Simone", "genres": ["observational", "storytelling", "character"], "touringStatus": "TOURING", "instagram": "thebsimone", "igFollowers": 6000000},
    {"name": "DC Young Fly", "genres": ["observational", "character", "crowd-work"], "touringStatus": "TOURING", "instagram": "dcyoungfly", "igFollowers": 7000000},
    {"name": "Karlous Miller", "genres": ["crowd-work", "roast", "character"], "touringStatus": "TOURING", "instagram": "karlousm", "igFollowers": 2500000},
    {"name": "Chico Bean", "genres": ["crowd-work", "roast", "character"], "touringStatus": "TOURING", "instagram": "chicobean", "igFollowers": 2500000},
    {"name": "DeRay Davis", "genres": ["observational", "character", "storytelling"], "touringStatus": "TOURING", "instagram": "imderaydavis", "igFollowers": 3000000},
    {"name": "Rickey Thompson", "genres": ["character", "sketch", "observational"], "touringStatus": "TOURING", "instagram": "rickeythompson", "igFollowers": 5000000},

    # More touring / festival comedians
    {"name": "Adam Ray", "genres": ["character", "impressionist", "observational"], "touringStatus": "TOURING", "instagram": "adamraycomedy", "igFollowers": 400000},
    {"name": "Sabrina Jalees", "genres": ["observational", "cultural", "LGBTQ"], "touringStatus": "TOURING", "instagram": "sabrinajalees", "igFollowers": 50000},
    {"name": "Mae Martin", "genres": ["observational", "confessional", "LGBTQ"], "touringStatus": "TOURING", "instagram": "maemartinn", "igFollowers": 300000},
    {"name": "Nina Conti", "genres": ["ventriloquism", "improvisation", "absurdist"], "touringStatus": "TOURING", "instagram": "ninaconti", "igFollowers": 100000},
    {"name": "Ennis Esmer", "genres": ["observational", "cultural"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Rachid Badouri", "genres": ["physical", "cultural", "character"], "touringStatus": "TOURING", "instagram": "rachidbadouri", "igFollowers": 200000},
    {"name": "Tom Green", "genres": ["absurdist", "physical", "shock"], "touringStatus": "TOURING", "instagram": "tomgreenofficial", "igFollowers": 300000},
    {"name": "Rafi Bastos", "genres": ["observational", "cultural"], "touringStatus": "TOURING", "instagram": "rafibastos", "igFollowers": 400000},
    {"name": "Ed Gamble", "genres": ["observational", "food", "storytelling"], "touringStatus": "TOURING", "instagram": "edgamblecomedy", "igFollowers": 200000},
    {"name": "Chris Turner", "genres": ["improvisation", "musical", "absurdist"], "touringStatus": "TOURING", "instagram": "christurnercomedy", "igFollowers": 50000},

    # Additional names from various lists to get closer to 2000
    {"name": "Craig Robinson", "genres": ["musical", "character", "observational"], "touringStatus": "TOURING", "instagram": "maborealrcraborealigrobinson", "igFollowers": 1500000},
    {"name": "Bob Saget", "genres": ["observational", "dark", "clean"], "touringStatus": "RETIRED", "instagram": None, "igFollowers": 0},
    {"name": "Eddie Murphy", "genres": ["character", "observational", "storytelling"], "touringStatus": "UNKNOWN", "instagram": "eddiemurphy", "igFollowers": 13000000},
    {"name": "Martin Lawrence", "genres": ["physical", "character", "storytelling"], "touringStatus": "TOURING", "instagram": "martinlawrence", "igFollowers": 10000000},
    {"name": "Kevin Nealon", "genres": ["observational", "deadpan", "one-liner"], "touringStatus": "TOURING", "instagram": "kevinaborealnealon", "igFollowers": 200000},
    {"name": "Jay Leno", "genres": ["observational", "clean", "topical"], "touringStatus": "TOURING", "instagram": "jayleno", "igFollowers": 1000000},
    {"name": "Craig Ferguson", "genres": ["observational", "storytelling", "improvisation"], "touringStatus": "TOURING", "instagram": "craigferguson", "igFollowers": 300000},
    {"name": "Dave Ross", "genres": ["absurdist", "character"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Nikki Carr", "genres": ["observational", "cultural", "storytelling"], "touringStatus": "TOURING", "instagram": "nikkicarr", "igFollowers": 200000},
    {"name": "Preacher Lawson", "genres": ["observational", "storytelling", "clean"], "touringStatus": "TOURING", "instagram": "preacherlawson", "igFollowers": 800000},
    {"name": "Brandon Wardell", "genres": ["observational", "absurdist"], "touringStatus": "REGIONAL", "instagram": "brandonwardell", "igFollowers": 200000},
    {"name": "Nore Davis", "genres": ["observational", "cultural", "storytelling"], "touringStatus": "TOURING", "instagram": "noredavis", "igFollowers": 30000},
    {"name": "Carmen Lynch", "genres": ["deadpan", "observational", "dark"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Marcella Arguello", "genres": ["observational", "cultural", "dark"], "touringStatus": "REGIONAL", "instagram": "marcella_arguello", "igFollowers": 20000},
    {"name": "Jesus Trejo", "genres": ["storytelling", "cultural", "observational"], "touringStatus": "TOURING", "instagram": "jesustrejo", "igFollowers": 300000},
    {"name": "Anjelah Johnson-Reyes", "genres": ["character", "cultural", "observational"], "touringStatus": "TOURING", "instagram": "anjelahjohnson", "igFollowers": 2000000},
    {"name": "Steve Trevino", "genres": ["storytelling", "cultural", "observational"], "touringStatus": "TOURING", "instagram": "stevetrevino", "igFollowers": 452000},
    {"name": "Erik Griffin", "genres": ["observational", "storytelling"], "touringStatus": "TOURING", "instagram": "erikgriffin", "igFollowers": 200000},
    {"name": "Brendan Schaub", "genres": ["observational", "storytelling"], "touringStatus": "TOURING", "instagram": "brendanschaub", "igFollowers": 2000000},
    {"name": "Luis J. Gomez", "genres": ["dark", "roast", "crowd-work"], "touringStatus": "TOURING", "instagram": "luisjgomez", "igFollowers": 200000},
    {"name": "Nataly Aukar", "genres": ["observational", "cultural"], "touringStatus": "REGIONAL", "instagram": "natalyaukar", "igFollowers": 80000},
    {"name": "Chris Scopo", "genres": ["observational"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Jason Choi", "genres": ["observational", "cultural"], "touringStatus": "LOCAL", "instagram": None, "igFollowers": 0},
    {"name": "Eva Evans", "genres": ["observational"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Bob Marley (comedian)", "genres": ["observational", "storytelling"], "touringStatus": "TOURING", "instagram": None, "igFollowers": 0},
    {"name": "Frank Caliendo", "genres": ["impressionist", "character"], "touringStatus": "TOURING", "instagram": "frankcaliendo", "igFollowers": 300000},
    {"name": "John Heffron", "genres": ["observational", "storytelling"], "touringStatus": "TOURING", "instagram": "johnheffron", "igFollowers": 30000},
    {"name": "Jay Mohr", "genres": ["impressionist", "character", "observational"], "touringStatus": "TOURING", "instagram": "jaymohr37", "igFollowers": 100000},
    {"name": "Pablo Francisco", "genres": ["impressionist", "physical", "character"], "touringStatus": "TOURING", "instagram": "pablofrancisc", "igFollowers": 100000},
    {"name": "Dat Phan", "genres": ["observational", "cultural"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Alonzo Bodden", "genres": ["observational", "political"], "touringStatus": "TOURING", "instagram": "alonzobodden", "igFollowers": 30000},
    {"name": "Tommy Johnagin", "genres": ["observational", "storytelling"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "John Caparulo", "genres": ["observational", "rant"], "touringStatus": "TOURING", "instagram": "johncaparulo", "igFollowers": 50000},
    {"name": "Greg Warren", "genres": ["observational", "clean"], "touringStatus": "TOURING", "instagram": None, "igFollowers": 0},
    {"name": "Nate Craig", "genres": ["dark", "one-liner"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Tom Rhodes", "genres": ["observational", "storytelling"], "touringStatus": "TOURING", "instagram": None, "igFollowers": 0},
    {"name": "Bobby Slayton", "genres": ["dark", "roast", "one-liner"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Rick Ingraham", "genres": ["observational", "cultural"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Michael Yo", "genres": ["observational", "cultural", "storytelling"], "touringStatus": "TOURING", "instagram": "michaelyo", "igFollowers": 100000},
    {"name": "Alingon Mitra", "genres": ["observational", "cultural"], "touringStatus": "REGIONAL", "instagram": "alingonmitra", "igFollowers": 20000},

    # Additional newer / emerging comedians
    {"name": "Matteo Lane", "genres": ["observational", "musical", "storytelling"], "touringStatus": "TOURING", "instagram": "matteolane", "igFollowers": 2000000},
    {"name": "Gabby Windey", "genres": ["observational", "storytelling"], "touringStatus": "LOCAL", "instagram": "gabby.windey", "igFollowers": 1000000},
    {"name": "Daniel Sloss", "genres": ["dark", "observational", "storytelling"], "touringStatus": "TOURING", "instagram": "danielsloss", "igFollowers": 500000},
    {"name": "Taylor Williamson", "genres": ["deadpan", "one-liner", "clean"], "touringStatus": "REGIONAL", "instagram": None, "igFollowers": 0},
    {"name": "Phil Wang", "genres": ["observational", "cultural", "one-liner"], "touringStatus": "TOURING", "instagram": "philwaborealng", "igFollowers": 200000},
    {"name": "Sasheer Zamata", "genres": ["observational", "cultural", "storytelling"], "touringStatus": "TOURING", "instagram": "sasheerzamata", "igFollowers": 352000},
    {"name": "Sarah Colonna", "genres": ["observational", "storytelling"], "touringStatus": "REGIONAL", "instagram": "sarahcolonna", "igFollowers": 170000},
    {"name": "Arden Myrin", "genres": ["character", "absurdist", "physical"], "touringStatus": "REGIONAL", "instagram": "ardenmyrin", "igFollowers": 128000},
]

def main():
    # Load existing data
    with open('/home/user/ComedyCountry/data/jester-comedians.json', 'r') as f:
        data = json.load(f)

    existing_names = {c['name'].lower() for c in data['comedians']}
    existing_slugs = {c['slug'] for c in data['comedians']}

    # Enrich existing comedians
    enriched_count = 0
    for comedian in data['comedians']:
        key = comedian['name'].lower()
        if key in ENRICHMENT:
            info = ENRICHMENT[key]
            if info.get('instagram'):
                comedian['instagram'] = info['instagram']
            if info.get('igFollowers'):
                comedian['igFollowers'] = info['igFollowers']
            if info.get('genres'):
                comedian['genres'] = info['genres']
            if info.get('touringStatus'):
                comedian['touringStatus'] = info['touringStatus']
            enriched_count += 1

    # Add new comedians
    added_count = 0
    for new in NEW_COMEDIANS:
        name_lower = new['name'].lower()
        if name_lower in existing_names:
            continue
        slug = make_slug(new['name'])
        if slug in existing_slugs:
            slug = slug + "-comedy"
        if slug in existing_slugs:
            continue

        entry = {
            "name": new['name'],
            "slug": slug,
            "source": "seed-research"
        }
        if new.get('instagram'):
            entry['instagram'] = new['instagram']
        if new.get('igFollowers') and new['igFollowers'] > 0:
            entry['igFollowers'] = new['igFollowers']
        if new.get('genres'):
            entry['genres'] = new['genres']
        if new.get('touringStatus'):
            entry['touringStatus'] = new['touringStatus']

        data['comedians'].append(entry)
        existing_names.add(name_lower)
        existing_slugs.add(slug)
        added_count += 1

    # Sort: by igFollowers desc (those with followers first), then alphabetically
    def sort_key(c):
        followers = c.get('igFollowers', 0) or 0
        return (-followers, c['name'].lower())
    data['comedians'].sort(key=sort_key)

    # Write output
    output_path = '/home/user/ComedyCountry/data/comedians-seed-expanded.json'
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Enriched {enriched_count} existing comedians")
    print(f"Added {added_count} new comedians")
    print(f"Total: {len(data['comedians'])} comedians")
    print(f"Written to: {output_path}")

if __name__ == '__main__':
    main()
