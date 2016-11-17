import sys,os, shutil
import youtube_dl
from pytube import YouTube
import numpy as np
import cv2 as cv2
import urllib
import json, uuid
import isodate
import pickle
from threading import Thread
import warnings
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC
import urlparse
from highlighter2 import Highlighter

channel_id = sys.argv[1]

videos = []
_api_key = "AIzaSyBFFC9kGalsfBWbWlX6TqDXqwxflo6s7k0"

# Extract the highlights from one video
def extract_scenes(url, nn_model, title, video_id):
	get_video(url)
	cat = get_category(video_id)
	h = Highlighter("videos/"+video_id+".3gp", nn_model, cat)
	ret = {"video_url": url, "video_id": video_id, "title": title, "highlights": h.get_highlights()}
	videos.append(ret)

# Download the video in the directory
def get_video(yt_url):
	ydl_opts = {
	    'format': '17',       
	    'outtmpl': 'videos/%(id)s.3gp',        
	    'noplaylist' : True
	}
	with youtube_dl.YoutubeDL(ydl_opts) as ydl:
		ydl.download([yt_url])


# Get the category of a video given an id
def get_category(id):
	# Get category
	urlCat = 'https://www.googleapis.com/youtube/v3/videos?part=snippet&id='+id+'&key='+_api_key
	feed1 = urllib.urlopen(urlCat)
	feed1 = feed1.read()
	feed_json1 = json.loads(feed1)
	cat = feed_json1["items"][0]['snippet']['categoryId']
	return cat

# Get the videos from the channel ID
def get_videos(channelID):
	url = "https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&order=date&type=video&video&channelId="+channelID+"&key="+_api_key
	feed1 = urllib.urlopen(url)
	feed1 = feed1.read()
	feed_json1 = json.loads(feed1)
	results = []
	titles = []
	for item in feed_json1["items"]:
		titles.append(item["snippet"]["title"])
		results.append(item['id']["videoId"])
	return titles, results

nn_model = None
try:
	with open('nn_model.pickle', 'rb') as f:
		nn_model = pickle.load(f)[0]
		print "Model loaded."
except:
	pass

if nn_model == None:
	data = np.loadtxt("data_out.csv", delimiter=',')
	X = data[:, 0:6]
	y = data[:, 6]
	classifier = MLPClassifier(activation='logistic', max_iter=1000, learning_rate='adaptive', hidden_layer_sizes=np.full((7, ), 30))
	classifier.fit(X, y)
	nn_model = classifier
	with open('nn_model.pickle', 'wb') as f:
			pickle.dump([classifier], f)
			
# Multi-threaded downloading
titles, urls = get_videos(channel_id)
print urls
threads = []
count = 0
for title, url in zip(titles, urls):
	if count < 5:
		thread = Thread(target=extract_scenes, args=("https://www.youtube.com/watch?v="+url, nn_model, title, url))
		threads.append(thread)
		thread.start()
	count += 1
for thread in threads:
	thread.join()

# Return the json
with open('out.json', 'w') as outfile:
    json.dump(videos, outfile)
