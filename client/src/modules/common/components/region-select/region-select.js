import { useContext } from 'react';
import { Select } from 'semantic-ui-react';
import { UserContext, RefineContext, REFINE_SET_ACTIVE_REGION } from 'contexts';
import { RegionIcon } from 'modules/common/components/region-icon';

export const RegionSelect = () => {
  const [{ assignment }] = useContext(UserContext);
  const [{ activeRegion }, refineContext] = useContext(RefineContext);

  const onChange = (evt, { value }) => {
    refineContext({ 
      type: REFINE_SET_ACTIVE_REGION, 
      region: assignment.regions.find(({ label }) => label === value )
    });
  }

  return (
    <Select 
      placeholder='No active region'          
      value={ activeRegion?.label }
      basic
      compact
      onChange={ onChange }
      options={ assignment.regions.map(region => (
        { 
          key: region.label,
          value: region.label,
          text: <RegionIcon region={ region } />
        }
      ))}
    />
  );
};