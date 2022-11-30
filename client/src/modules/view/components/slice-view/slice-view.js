import { RenderWindow, Slice, Image } from 'modules/view/components';
import { Widgets } from 'modules/view/components/slice-view/widgets';
import { MaskPainter } from 'modules/view/components/slice-view/mask-painter';

export function SliceView() {
  // Callbacks
  let onEdit = () => {};
  let onImageMapperChange = () => {};
  let onSliceChange = () => {};

  const renderWindow = RenderWindow();
  const image = Image();
  const slice = Slice();
  const mask = MaskPainter();
  const widgets = Widgets(mask.getPainter());

  const render = renderWindow.render;

  return {
    initialize: rootNode => {
      if (renderWindow.initialized()) return;

      renderWindow.initialize(rootNode);      
      slice.initialize(renderWindow);

      widgets.setRenderer(renderWindow.getRenderer());
    },
    getPainter: () => mask.getPainter(),
    getImageMapper: () => slice.getImageMapper(),
    setCallback: (type, callback) => {
      switch (type) {
        case 'edit':
          onEdit = callback;
          widgets.setCallback(type, callback);
          break;

        case 'imageMapperChange':
          onImageMapperChange = callback;
          break;

        case 'sliceChange':
          onSliceChange = callback;
          break;

        case 'keyDown':
          slice.setCallback(type, key => key === 'i' ? image.toggleInterpolation() : callback(key));
          break;

        case 'keyUp':
          slice.setCallback(type, callback);
          break;

        default: 
          widgets.setCallback(type, callback);
      }
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

      onImageMapperChange(slice.getImageMapper());
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
    setWidgetPosition: (position, linkSlice) => {
      if (position) {
        const spacing = image.getInputData().getSpacing();
        const extent = image.getInputData().getExtent();        

        const p = position.map((p, i) => Math.max(extent[i * 2], Math.min(p / spacing[i], extent[i * 2 + 1])));

        if (linkSlice) image.getMapper().setSlice(Math.floor(p[2]));
        widgets.setPosition(p);
      }
    },
    setTool: (tool, cursor) => {
      widgets.setTool(tool);
      renderWindow.setCursor(cursor);
      render();
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
      onEdit();
    },
    redo: () => {
      mask.getPainter().redo();
      onEdit();
    },
    canUndo: () => mask.getPainter().canUndo(),
    canRedo: () => mask.getPainter().canRedo(),
    render: () => render(),
    getCamera: () => renderWindow.getRenderer().getActiveCamera(),
    mouseOut: () => {
      widgets.mouseOut();
      mask.setHighlightRegion(null);
    },
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