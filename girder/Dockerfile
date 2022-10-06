FROM girder/girder:latest

ARG GIRDER_CFG_FILE

WORKDIR /girder
RUN mkdir data log 
COPY data /girder/data
COPY plugins /girder/plugins
COPY requirements.txt /girder/requirements.txt
COPY $GIRDER_CFG_FILE /girder/girder/conf/girder.dist.cfg

RUN pip install celery==4.4.7 \
  && pip install girder-jobs==3.1.15 \
  && pip install girder-homepage==3.1.15 \
  && pip install numpy==1.18.5 \
  && pip install girder-worker==0.8.2 \
  && pip install -r requirements.txt \
  && girder build

ENTRYPOINT ["girder", "serve"]
