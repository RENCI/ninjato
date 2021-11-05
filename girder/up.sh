#!/bin/bash
docker-compose up --build -d -V
echo "INFO: allow girder and girder-mongodb containers to stand up before restoring data"
for pc in $(seq 10 -1 1); do
    echo -ne "$pc ...\033[0K\r" && sleep 1;
done
sh restore_db.sh
