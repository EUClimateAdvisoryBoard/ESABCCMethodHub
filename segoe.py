import glob
from matplotlib import font_manager
for p in glob.glob('/root/.fonts/Selawik*.ttf'): font_manager.fontManager.addfont(p)
