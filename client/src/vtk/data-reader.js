import axios from 'axios';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import HttpDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import { api } from '../api';

export const loadData = async (dataId, maskId) => {


const url = 'http://192.168.56.101:8080/api/v1/file/615385db4fc1dbc94c562c56'

  console.log(dataId, maskId);
/*
  const reader = vtkHttpDataSetReader.newInstance();

  reader.setUrl(
    api.fileUrl(dataId)
  )
  .then(() => {
    console.log(reader);
  });
*/  

  //const helper = HttpDataAccessHelper.newInstance();
/*
  const fileReader = new FileReader();
  fileReader.onload = function onLoad(e) {
    console.log(fileReader.result);
  };
  fileReader.readAsArrayBuffer(url);
*/

/*
  const progressCallback = (progressEvent) => {
    if (progressEvent.lengthComputable) {
      const percent = Math.floor(
        (100 * progressEvent.loaded) / progressEvent.total
      );
      console.log(percent);
    }
  };

  HttpDataAccessHelper.fetchBinary(url, {
    progressCallback,
  }).then((binary) => {
    console.log(binary);
  });
*/

  const result = await axios.get(api.fileUrl(dataId),{
    responseType: 'arraybuffer'
  });

  console.log(result);

  const mapper = vtkMapper.newInstance();

  mapper.setInputData(result.data);

  mapper.update();

  console.log(mapper.getScalarRange());

  /*
  const fileReader = new FileReader();
  fileReader.onload = function onLoad(e) {
    console.log(fileReader.result);
  };
  fileReader.readAsArrayBuffer(result.data);
  */
}