#!/bin/bash

docker exec girder-mongodb sh -c 'exec mongodump --gzip --archive > dump_data.gz'
docker cp girder-mongodb:dump_data.gz dump_data_`date "+%Y-%m-%d"`.gz
