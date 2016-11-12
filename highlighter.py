import sys,os, shutil
from pytube import YouTube
import numpy as np
import cv2 as cv2
import urllib
import json, uuid
import isodate
import pickle
from threading import Thread
import warnings

#Program Constants
_min_scene_length = 6 # the minimum number of seconds in a scene
_min_min_scene_length = 4
_max_scene_length = 15 # the max number of seconds in a scene
_alpha = 0.05 # the wight for the scene detection

# Disable warnings
def fxn():
    warnings.warn("deprecated", DeprecationWarning)
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    fxn()

# Parsing the urls passed as argument
urls = sys.argv[1:]
videos = []

# Extract the scenes by applying the pipeline
def extract_scenes(url, model):
	directory = str(uuid.uuid4())
	fname, cat = get_video(url, directory)
	#print "DONE DOWNL"
	cap = cv2.VideoCapture(directory+'/'+fname+'.3gp')
	# cat = 2
	# cap = cv2.VideoCapture('videos/1.3gp')
	#print directory+'/'+fname+'.3gp'
	scenes = get_scenes(cap)
	#print "GOT SCENES"
	i = 0
	avrg_duration = 0
	for scene in scenes:
		vect = [
				float(cat),
				scene["avrg_brightness"],
				scene["avrg_bspeed"],
				scene["duration"],
				scene["max_brightness"],
				scene["max_bspeed"]
			]
		#print vect
		vect = np.array(vect)
		#print "OK"
		avrg_duration += scene["duration"]
		scenes[i]["score"] = np.asscalar(model.predict(vect.reshape(1,-1)))
		i += 1

	if len(scenes) > 0:
		avrg_duration /= 1.0*len(scenes)
	if avrg_duration > (_max_scene_length+_min_scene_length)/2:
		scenes.sort(key=lambda x: (-x['score'], -x['duration']))
	else:
		scenes.sort(key=lambda x: (x['start']))

	d = 0
	ret_scenes = {"url": url, "highlights": []}
	for i in range(len(scenes)):
		if d > _max_scene_length:
			break
		ret_scenes["highlights"].append(scenes[i])
		d += scenes[i]['duration']
	videos.append(ret_scenes)

	# Delete the temporary files
	shutil.rmtree(directory)

# Download the video in the directory
def get_video(yt_url, directory):
	to_download = YouTube(yt_url)
	video = to_download.get('3gp','144p')
	if not os.path.exists(directory+'/'):
		os.makedirs(directory+'/')
	video.download(directory+'/')
	cat = get_category(to_download.video_id)
	return (video.filename, cat)

# Get the category of a video given an id
def get_category(id):
	# Get category
	urlCat = 'https://www.googleapis.com/youtube/v3/videos?part=snippet&id='+id+'&key=AIzaSyA2cu1skGcRjDfIpG2I1ri_MWeObrZGS30'
	feed1 = urllib.urlopen(urlCat)
	feed1 = feed1.read()
	feed_json1 = json.loads(feed1)
	cat = feed_json1["items"][0]['snippet']['categoryId']
	return cat

# Extract the scene from the video once downloaded
def get_scenes(cap, tail=2):
	last_frame = None
	i = 0
	fgbg = cv2.BackgroundSubtractorMOG()
	exp_avrg = 0
	scenes = []
	avrgs = []
	diffs = []
	max_bspeed = 0
	count = 0
	max_brightness = 0
	avrg_brightness = 0
	while(cap.isOpened()):
		ret, frame = cap.read()
		if ret:
			if i == tail:
				fgbg = cv2.BackgroundSubtractorMOG()
				i = 0
			fgmask = fgbg.apply(frame)
			frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
			brightness = frame.mean()
			width, height = frame.shape
			if i > 0 and i < tail:
				w,h = fgmask.shape
				diff = np.count_nonzero(fgmask)/(1.0*w*h)
				if diff > exp_avrg:
					avrg_brightness /= 1.0*count
					scenes.append({"end_frame": cap.get(cv2.cv.CV_CAP_PROP_POS_FRAMES), 
								   "max_bspeed": max_bspeed,
								   "avrg_bspeed": exp_avrg,
								   "max_brightness": max_brightness,
								   "avrg_brightness": avrg_brightness})
					exp_avrg =  _alpha*diff+(1-_alpha)*exp_avrg
					max_bspeed = 0
					max_brightness = 0
				max_bspeed = max(diff, max_bspeed)
				avrgs.append(exp_avrg)
				diffs.append(diff)
			count += 1
			max_brightness = max(brightness, max_brightness)
			avrg_brightness += brightness

			i += 1
			if cap.get(cv2.cv.CV_CAP_PROP_POS_FRAMES) == cap.get(cv2.cv.CV_CAP_PROP_FRAME_COUNT):
				break
	#print scenes
	fr_start = 0
	ret_scenes = []
	for j in range(len(scenes)):
		scene = scenes[j]
		fr_end = scene["end_frame"]
		duration = (fr_end-fr_start)/cap.get(cv2.cv.CV_CAP_PROP_FPS)
		if duration > _min_scene_length and duration < _max_scene_length:
			scenes[j]["start"] = fr_start/cap.get(cv2.cv.CV_CAP_PROP_FPS)
			scenes[j]["end"] = fr_end/cap.get(cv2.cv.CV_CAP_PROP_FPS)
			scenes[j]["duration"] = duration
			scenes[j]["position"] = fr_start/cap.get(cv2.cv.CV_CAP_PROP_FRAME_COUNT)
			ret_scenes.append(scenes[j])
		fr_start = fr_end

	if len(ret_scenes) == 0:
		fr_start = 0
		ret_scenes = []
		for j in range(len(scenes)):
			fr_end = scenes[j]["end_frame"]
			duration = (fr_end-fr_start)/cap.get(cv2.cv.CV_CAP_PROP_FPS)
			if duration > _min_min_scene_length:
				scenes[j]["start"] = fr_start/cap.get(cv2.cv.CV_CAP_PROP_FPS)
				scenes[j]["end"] = fr_end/cap.get(cv2.cv.CV_CAP_PROP_FPS)
				scenes[j]["duration"] = duration
				scenes[j]["position"] = fr_start/cap.get(cv2.cv.CV_CAP_PROP_FRAME_COUNT)
				ret_scenes.append(scenes[j])
			fr_start = fr_end

	return ret_scenes


#print urls
# Loading the ML model
#print "Loading the model..."
nn_model = None
try:
	with open('nn_model.pickle', 'rb') as f:
		nn_model = pickle.load(f)[0]
		print "Model loaded."
except:
	pass

# Multi-threaded downloading
threads = []
for url in urls:
	thread = Thread(target=extract_scenes, args=(url, nn_model))
	threads.append(thread)
	thread.start()
for thread in threads:
	thread.join()

# Return the json
print json.dumps(videos)
