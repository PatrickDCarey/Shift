#!/bin/bash
# bash review.sh <clip> -> release/trailer/review/<clip>.png : 6 evenly spaced frames, 3x2
cd "C:/dev/itch gam/release/trailer"; mkdir -p review
n=$(ffprobe -v error -select_streams v -count_packets -show_entries stream=nb_read_packets -of csv=p=0 clips/$1.mp4)
ffmpeg -loglevel error -y -i clips/$1.mp4 -vf "select='not(mod(n\,$((n/6))))',scale=640:360,tile=3x2" -frames:v 1 -vsync 0 review/$1.png
