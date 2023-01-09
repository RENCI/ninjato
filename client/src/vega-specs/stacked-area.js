export const stackedArea = {
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  width: 'container',
  height: 400,
  autosize: {
    type: 'fit',
    resize: true
  },
  data: {
    name: 'data'
  },
  mark: { 
    type: 'area', 
    line: true, 
    tooltip: true 
  },
  encoding: {
    x: {
      field: 'time',
      timeUnit: 'yearmonthdate',
      type: 'temporal'
    },
    y: {
      aggregate: 'median',
      field: 'count',
      type: 'quantitative'
    },
    color: {
      field: 'status',
      type: 'nominal',
      sort: ['declined', 'completed', 'review', 'active']
    },
    order: {
      field: 'order'
    }
  }
};