import { Surface } from './surface';

export function RegionSurface() {
  const surface = Surface();
  surface.setSliceHighlight(true);
  surface.getMapper().setScalarVisibility(false);

  return {
    setRegion: region => surface.setRegions([region]),
    getRegion: () => surface.getRegions()[0],
    setInputData: data => surface.setInputData(data),
    getInputData: () => surface.getInputData(),
    getActor: () => surface.getActor(),
    getHighlight: () => surface.getHighlight(),
    setVisibility: visible => surface.getActor().setVisibility(visible),
    setColor: color => {
      const property = surface.getActor().getProperty();
      property.setColor(color);
      property.setAmbient(0);
      property.setOpacity(1.0);
      property.setBackfaceCulling(false);

      surface.getHighlight().getActor().getProperty().setColor(color);
    },
    setShowHighlight: highlight => surface.getHighlight().getActor().setVisibility(highlight),
    setSlice: (slice, colors) => surface.setSlice(slice, colors),
    getOutput: () => surface.getOutput(),
    cleanUp: () => {
      console.log('Clean up region surface');
      
      // Clean up anything we instantiated
      surface.cleanUp();
    }
  };
}