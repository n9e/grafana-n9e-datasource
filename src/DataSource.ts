import _ from 'lodash';
import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';
import { BackendSrv, getTemplateSrv } from '@grafana/runtime';

import { MyQuery, MyDataSourceOptions, defaultQuery } from './types';
import { hasDtag, hasVariable, getDTagvKeyword, dFilter, getDTagV } from './Components/Tagkv/utils';
import { TypeTreeNode } from './Components/TreeSelect/types';
import { normalizeEndpointCounters } from './utils';
import { comparisonOptions } from './config';
import { request, fetchTreeData, fetchEndpointsData, fetchCountersData, fetchSeriesData } from './services';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  constructor(public instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>, public backendSrv: BackendSrv) {
    super(instanceSettings);
  }

  treeData: TypeTreeNode[] = [];

  fetchTreeData() {
    return fetchTreeData(this.instanceSettings, this.backendSrv).then(res => {
      const treeData = _.map(res, item => {
        return {
          text: item.path,
        };
      });
      this.treeData = res;
      return treeData;
    });
  }

  fetchEndpointsData(nid: number) {
    return fetchEndpointsData(this.instanceSettings, this.backendSrv, nid);
  }

  fetchCountersData(reqData: any) {
    return fetchCountersData(this.instanceSettings, this.backendSrv, reqData);
  }

  fetchSeriesData(reqData: any) {
    return fetchSeriesData(this.instanceSettings, this.backendSrv, reqData);
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const templateSrv = getTemplateSrv();
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();
    let data: any[] = [];

    for (let targetIdx = 0; targetIdx < options.targets.length; targetIdx++) {
      const query = _.defaults(options.targets[targetIdx], defaultQuery);
      const { category, selectedNid, selectedMetric, tagkv, aggrFunc, groupKey, comparison, _nids } = query;
      let { selectedEndpointsIdent, selectedTagkv } = query;
      const cateKey = category === 0 ? 'endpoints' : 'nids';
      let cateVal = selectedEndpointsIdent;

      if (category === 0) {
        if (hasDtag(cateVal)) {
          const endpointsData = (await this.fetchEndpointsData(selectedNid[0])) as string[];
          const dTagvKeyword = getDTagvKeyword(cateVal[0]) as string;
          cateVal = dFilter(dTagvKeyword, cateVal[0], endpointsData);
        } else if (hasVariable(cateVal)) {
          const replaced = templateSrv.replace(cateVal[0], undefined, (result: any) => {
            return result;
          });
          cateVal = _.split(replaced, ',');
        }
      } else if (category === 1) {
        cateVal = _nids;
      }

      if (hasDtag(selectedTagkv)) {
        selectedTagkv = _.map(selectedTagkv, item => {
          return {
            tagk: item.tagk,
            tagv: getDTagV(tagkv, item),
          };
        });
      }
      if (!selectedMetric && _.isEmpty(selectedEndpointsIdent)) {
        break;
      }
      const counters = await this.fetchCountersData([
        {
          [cateKey]: cateVal,
          metric: selectedMetric,
          tagkv: selectedTagkv,
        },
      ]);
      const endpointCounters = normalizeEndpointCounters(
        {
          start: from,
          end: to,
          aggrFunc,
          groupKey,
          comparison,
        },
        counters
      );
      let sourceData: any[] = [];
      for (let i = 0; i < endpointCounters.length; i++) {
        const sdata = await this.fetchSeriesData(endpointCounters[i]);
        sourceData = _.concat(sourceData, sdata);
      }
      const seriesData = _.map(sourceData, item => {
        const timeValues: number[] = [];
        const valueValues: number[] = [];
        _.forEach(item.values, valItem => {
          timeValues.push(valItem.timestamp * 1000);
          valueValues.push(valItem.value);
        });
        let serieName = `${item.endpoint ? item.endpoint : selectedMetric} ${item.counter}`;
        if (_.isArray(comparison) && comparison.length > 0 && item.comparison) {
          serieName += ` (${_.get(
            _.find(comparisonOptions, { value: String(Number(item.comparison) * 1000) }),
            'labelEn'
          )} ago)`;
        }
        const serieData = new MutableDataFrame({
          refId: serieName,
          fields: [
            {
              name: 'Time',
              type: FieldType.time,
              values: timeValues,
            },
            {
              name: serieName,
              type: FieldType.number,
              values: valueValues,
            },
          ],
        });
        return serieData;
      });
      data = _.concat(data, seriesData);
    }
    return { data };
  }

  metricFindQuery(query: 'Node' | 'Endpoints BY $Node', options?: any) {
    if (query === 'Node') {
      return this.fetchTreeData();
    }
    if (query === 'Endpoints BY $Node') {
      const templateSrv = getTemplateSrv();
      const variable = _.find(templateSrv.getVariables(), { name: 'Node' });
      const nodePath = _.get(variable, 'current.value');
      const node = _.find(this.treeData, { path: nodePath });
      if (node && node.id) {
        return this.fetchEndpointsData(node.id).then((res: any) => {
          return _.map(res, item => {
            return {
              text: item,
            };
          });
        });
      }
      return [] as any;
    }
    return [] as any;
  }

  async testDatasource() {
    const {
      jsonData: { version },
    } = this.instanceSettings;
    return request(this.instanceSettings, this.backendSrv, {
      url: version === 'v3' ? '/api/hsp/tree' : '/v1/portal/tree',
      method: 'GET',
    })
      .then((res: any) => {
        if (res.status === 200) {
          if (!res.data.err) {
            return {
              status: 'success',
              message: 'Success',
            };
          } else {
            return {
              status: 'failure',
              message: res.data.err,
            };
          }
        } else {
          return {
            status: 'failure',
            message: res.statusText,
          };
        }
      })
      .catch((err: any) => {
        return {
          status: 'failure',
          message: err.statusText,
        };
      });
  }
}
