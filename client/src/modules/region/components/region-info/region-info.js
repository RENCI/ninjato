import { RegionIcon } from 'modules/region/components/region-icon';
import { Label, Icon } from 'semantic-ui-react';

export const RegionInfo = ({ region }) => {

  console.log(region);

  return !region ? null : (
    <>
      <div><RegionIcon region={ region } /></div>
      { region.info &&
        <>
          <Label>
            <Icon name='lock open' /> 
            { region.info.status }
          </Label>
        </>
      }
    </>
  );
};
