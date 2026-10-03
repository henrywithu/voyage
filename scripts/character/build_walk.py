import os
import sys
import master, rigs
M, H = master.load(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build/chaewon_master.npz'))
cfg = rigs.walk_config()
X, W, ps = rigs.retarget(cfg, M, H)
rigs.export_skinned(cfg, X, W, sys.argv[1])
print('walk', len(X['P']))
