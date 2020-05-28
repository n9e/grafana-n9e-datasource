import _ from 'lodash';

export function transformMsToS(ts: string) {
  return Number(ts.substring(0, ts.length - 3));
}

export function processComparison(comparison: string[]) {
  const newComparison = [0];
  _.each(comparison, o => {
    newComparison.push(transformMsToS(String(o)));
  });
  return newComparison;
}

export function normalizeEndpointCounters(query: any, counterList: any[]) {
  const { aggrFunc, groupKey, comparison } = query;
  const newComparison = processComparison(comparison);
  const start = transformMsToS(_.toString(query.start));
  const end = transformMsToS(_.toString(query.end));

  const counters = _.map(counterList, counter => {
    return {
      ...counter,
      start,
      end,
      aggrFunc,
      groupKey,
      consolFunc: 'AVERAGE',
      comparisons: newComparison,
    };
  });

  return counters;
}
