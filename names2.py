SH = {295: 'GCAM-PR', 308: 'IMAGE', 397: 'POLES GECO', 718: 'POTEnCIA', 779: 'REMIND 3.2', 1159: 'POLES ELEVATE', 1275: 'REMIND-EU CCS350', 1327: 'JRC-EU-TIMES', 866: 'TIAM-ECN', 862: 'REMIND 2.1',
      1257: 'REMIND-EU CCS110', 1266: 'REMIND-EU CCS180', 1321: 'REMIND-EU Elec', 1233: 'PRIMES HighEff', 1234: 'PRIMES HighElec'}
FAMC = {'REMIND': '#3b2468', 'POLES': '#b08a1e', 'GCAM': '#ec621d', 'PRIMES': '#5a7fc0', 'POTEnCIA': '#2f8f5b', 'TIMES': '#a84048', 'IMAGE': '#8c6d46', 'TIAM': '#9a9a9a'}
def fam(m):
    for p in ('REMIND', 'IMAGE', 'PRIMES', 'POLES', 'GCAM', 'MESSAGE', 'WITCH', 'AIM', 'TIAM', 'POTEnCIA', 'TIMES', 'COFFEE', 'IMACLIM'):
        if p in m: return p
    return m
