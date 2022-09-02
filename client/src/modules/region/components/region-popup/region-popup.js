import { Popup } from 'semantic-ui-react';
import { RegionInfo } from 'modules/region/components/region-info';

export const RegionPopup = ({ region, trigger }) => {
  return (
    <Popup 
      trigger={ trigger }
      content={ <RegionInfo region={ region } /> }
      open={ region !== null }
      position='top center'
      offset={ [0, 10] }
    /> 
  );
};
