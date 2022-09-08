import { RenderWindow, Slice, Image } from 'modules/view/components';
import { Widgets } from 'modules/view/components/slice-view/widgets';
import { MaskPainter } from 'modules/view/components/slice-view/mask-painter';

export function SliceView(onEdit, onSliceChange, onSelect, onHover, onHighlight, onKeyDown, onKeyUp) {
  const renderWindow = RenderWindow();
  const image = Image();
  const slice = Slice(evt => evt.key === 'i' ? image.toggleInterpolation() : onKeyDown ? onKeyDown(evt) : null, onKeyUp);
  const mask = MaskPainter();

  /*
  const isValid = label => label !== null && label !== 0;

  const onRegionHover = (label, highlight) => {
    onHover(label);

    if (isValid(label)) {
      onHighlight(label);
    }
    else {
      onHighlight(null);
    }
  };
  */

  const widgets = Widgets(mask.getPainter(), onEdit, onSelect, onHover, onHighlight);

  return {
    initialize: rootNode => {
      if (renderWindow.initialized()) return;

      renderWindow.initialize(rootNode);      
      slice.initialize(renderWindow);

      widgets.setRenderer(renderWindow.getRenderer());
    },
    setData: (imageData, maskData, sliceRanges) => {
      image.setInputData(imageData);    
      mask.setInputData(maskData);

      const renderer = renderWindow.getRenderer();
      renderer.addViewProp(image.getActor());
      renderer.addViewProp(mask.getActor());

      widgets.setImageData(maskData);

      const onUpdateSlice = (z, position) => {
        // Update mask slice
        mask.setSlice(z);

        // Update widget position
        widgets.update(position, imageData.getSpacing());

        // Callback
        onSliceChange(z);
      }

      slice.setImage(image.getActor(), renderWindow.getCamera(), sliceRanges, onUpdateSlice);
      if (mask.getActiveRegion()) slice.setSliceByLabel(image.getMapper(), maskData, mask.getActiveRegion().label);
    },
    setRegions: (regions, backgroundRegions) => {
      mask.setRegions(regions);
      widgets.setRegions(regions, backgroundRegions);

      if (!mask.getActiveRegion() && regions.length > 0) {
        const region = regions[0];
        
        mask.setActiveRegion(region);
        widgets.setActiveRegion(region);
      }
    },
    setActiveRegion: region => {
      mask.setActiveRegion(region);
      widgets.setActiveRegion(region);
    },
    setHighlightRegion: region => mask.setHighlightRegion(region),
    setTool: (tool, cursor) => {
      widgets.setTool(tool)
      renderWindow.setCursor(cursor);
    },
    setBrush: (type, brush) => widgets.setBrush(type, brush),
    setSlice: slice => image.getMapper().setSlice(slice),
    setShowContours: show => mask.getActor().setVisibility(show),
    splitRegion: async (splitLabel, newLabel, splitMode) => {
      const painter = mask.getPainter();

      const currentLabel = painter.getLabel();

      const slice = image.getMapper().getSlice();
            
      painter.setLabel(newLabel);
      painter.startStroke();      
      painter.split(splitLabel, splitMode === 'top' ? slice + 1: slice);            
      const promise = painter.endStroke();    
      await promise;

      painter.setLabel(currentLabel);

      onEdit();

      return promise;
    },
    mergeRegion: async region => {
      const painter = mask.getPainter();

      painter.startStroke();      
      painter.merge(region.label);
      const promise = painter.endStroke();    
      await promise;

      onEdit();

      return promise;
    },
    createRegion: region => {
      mask.setActiveRegion(region);
      return widgets.createRegion();      
    },
    deleteRegion: async region => {
      const painter = mask.getPainter();

      const currentLabel = painter.getLabel();

      painter.setLabel(region.label);
      painter.startStroke();      
      painter.deleteRegion();
      const promise = painter.endStroke(true);    
      await promise;

      painter.setLabel(currentLabel);

      onEdit();

      return promise;
    },
    undo: () => {
      mask.getPainter().undo();
      onEdit(false);
    },
    redo: () => {
      mask.getPainter().redo();
      onEdit(false);
    },
    canUndo: () => mask.getPainter().canUndo(),
    canRedo: () => mask.getPainter().canRedo(),
    cleanUp: () => {
      console.log('Clean up slice view');

      // Clean up anything we instantiated
      renderWindow.cleanUp();
      slice.cleanUp();
      image.cleanUp();
      mask.cleanUp();
      widgets.cleanUp();
    }
  };
}