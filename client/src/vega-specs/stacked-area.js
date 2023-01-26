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
  transform: [
    {timeUnit: "yearmonthdate", field: "time", as: "date"},
    {
      aggregate: [{op: "median", field: "count", as: "count"}],
      groupby: ["date"]
    },
    {calculate: "day(datum.date) == 0", as: "sundays"},
    {
      window: [{op: "sum", field: "sundays", as: "week"}],
      sort: "date"
    },
    {
      aggregate: [{
       op: "mean",
       field: "count",
       as: "temp"
      }],
      groupby: ["week"]
    }
  ],
  mark: { 
    type: 'area', 
    line: true, 
    tooltip: true 
  },
  encoding: {
    x: {
      field: 'week',
      type: 'temporal'
    },
    y: {
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