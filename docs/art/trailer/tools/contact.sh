#!/bin/bash
# bash contact.sh -> release/trailer/contact-sheet.png (the middle frame of every clip, labelled)
cd "C:/dev/itch gam/release/trailer"; mkdir -p review/cs; rm -f review/cs/*
i=0
for f in clips/shot-*.mp4; do
  n=$(basename $f .mp4); c=$(ffprobe -v error -select_streams v -count_packets -show_entries stream=nb_read_packets -of csv=p=0 $f)
  ffmpeg -loglevel error -y -i $f -vf "select='eq(n\,$((c/2)))',scale=640:360,drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='$n':x=8:y=h-24:fontcolor=white:fontsize=16:box=1:boxcolor=black@0.6" -frames:v 1 -vsync 0 review/cs/$(printf %02d $i).png
  i=$((i+1))
done
ffmpeg -loglevel error -y -framerate 1 -i review/cs/%02d.png -vf "tile=3x$(( (i+2)/3 ))" -frames:v 1 contact-sheet.png
