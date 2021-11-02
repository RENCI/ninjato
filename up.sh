#!/bin/bash
docker-compose up --build -d -V
echo "INFO: allow girder-server and girder-mongodb containers to stand up before restoring d
ata"
for pc in $(seq 10 -1 1); do
    echo -ne "$pc ...\033[0K\r" && sleep 1;
done
sh girder/restore_db.sh girder/test_data.gz
