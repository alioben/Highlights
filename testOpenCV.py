from threading import Thread
import numpy as np
import cv2

cap = cv2.VideoCapture("video.3gp")
length = int(cap.get(cv2.cv.CV_CAP_PROP_FRAME_COUNT))
print length

cap.set(cv2.cv.CV_CAP_PROP_POS_FRAMES, 1000)
while(True):
    # Capture frame-by-frame
    ret, frame = cap.read()

    # Our operations on the frame come here
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    print cap.get(cv2.cv.CV_CAP_PROP_POS_FRAMES)

    # Display the resulting frame
    cv2.imshow('frame',gray)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# When everything done, release the capture
cap.release()
cv2.destroyAllWindows()