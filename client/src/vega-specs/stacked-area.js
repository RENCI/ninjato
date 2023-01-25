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
      timeUnit: 'yearweek',
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
      scale: { 
        scheme: 'status' 
      },
      sort: ['active', 'review', 'completed', 'declined', 'reviewDeclined'],
      legend: {
        labelExpr: 'lower(replace(datum.label, /([A-Z])/g, " $1"))'
      }
    },
    order: {
      field: 'order'
    }
  }
};