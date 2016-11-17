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


def get_ids(str):
	ids = []
	splitted = str.split('"channelId":"')
	for i in range(len(splitted)):
		if i > 0:
			print splitted[i].index('"')
			id = splitted[i][:splitted[i].index('"')]
			ids.append(id)
	return ids




print getVideos("UCBkNpeyvBO2TdPGVC_PsPUA")