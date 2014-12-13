#!/bin/sh

DIR=/home/dave/gps/backup
[ -d $DIR ] || exit
mongoexport --db gps -h localhost -c nodes -o $DIR/nodes.$(date +"%Y-%m-%d").json
mongoexport --db gps -h localhost -c links -o $DIR/links.$(date +"%Y-%m-%d").json
mongoexport --db gps -h localhost -c users -o $DIR/users.$(date +"%Y-%m-%d").json
