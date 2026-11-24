exec(open('charts.py').read().split('OUT = {}')[0])
S0 = pd.read_csv('systems_fix.csv', low_memory=False); n0 = len(S0); T = ST.iloc[:n0]; X = S0
g = lambda c, t: X[c].notna() & (X[c] > t)
base = X.det & ~X.dup; p30 = base & ~(T.red30 < 54.95)
jrc = X.net50.isna() & (X.src == 'JRC') & X.nz0.fillna(False).astype(bool)
w1 = (T.red >= 84.95) & (T.red < 90.5)
def red(t):
    f = g('cap50', 500*t) | g('bio50', 20*t) | g('wccs50', 8600*t) | g('wbio50', 240) | g('h2_30', 1.89) | g('fe_decl', 20); r = g('cap50', 425*t) | g('bio50', 9*t) | g('land50', 400)
    return p30 & w1 & ((X.net50 <= 50) | jrc) & ~f & ~r
S3 = pd.read_csv('sets3.csv', index_col=0)
r5 = red(1.05); print('5% matches sets3:', (r5.values == S3.s2.reindex(X.index).fillna(False).values).all(), r5.sum())
r10 = red(1.10); print('10%:', r10.sum())
new = X[r10 & ~r5]
print(new[['model', 'scenario', 'src', 'net50', 'cap50', 'bio50', 'wccs50', 'land50']].assign(red40=T.red[new.index]).to_string())
import sys
if len(sys.argv) > 1: S3['s2'] = r10.reindex(S3.index).values; S3.to_csv('sets3.csv'); print('written')
