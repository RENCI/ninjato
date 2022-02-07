From girder/girder:latest

WORKDIR /girder
RUN mkdir data
COPY data /girder/data
COPY plugins /girder/plugins
COPY requirements.txt /girder/requirements.txt
RUN pip install girder-jobs
RUN pip install girder-homepage
RUN pip install numpy==1.18.5
RUN pip install -r requirements.txt
RUN girder build

ENTRYPOINT ["girder", "serve"]

