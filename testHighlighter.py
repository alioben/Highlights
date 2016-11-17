from highlighter2 import Highlighter
import matplotlib.pyplot as plt


def get_insight():
	x = []
	y = []
	arr_ratio=0.1
	step = 0.1
	er=1
	while arr_ratio < er:
		print "arr_ratio:", arr_ratio
		x.append(arr_ratio)
		y.append(run_with(arr_ratio))
		arr_ratio += step

	plt.plot(x, y)
	plt.xlabel('min frame ratio')
	plt.ylabel('run time')
	plt.show()


def run_with(arr_ratio, iter=3):
	sum = 0
	for i in range(iter):
		h = Highlighter("videos/macbook.3gp", _max_array_ratio=arr_ratio, _skip_rate=4)
		for a in  h.get_highlights():
			print a["start"], a["end"], a["duration"]
		sum += h.get_time()
	return sum*(1./iter)

print run_with(0.5,iter=1)