FROM girder/girder:latest

WORKDIR /girder
RUN mkdir data
COPY data /girder/data
COPY plugins /girder/plugins
COPY requirements.txt /girder/requirements.txt
RUN pip install girder-jobs \
  && pip install girder-homepage \
  && pip install numpy==1.18.5 \
  && pip install -r requirements.txt \
  && girder build

ENTRYPOINT ["girder", "serve"]
