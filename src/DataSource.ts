import _ from 'lodash';
import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';
import { BackendSrv, BackendSrvRequest, getTemplateSrv } from '@grafana/runtime';
import { message } from 'antd';

import { MyQuery, MyDataSourceOptions, defaultQuery } from './types';
import { hasDtag, hasVariable, getDTagvKeyword, dFilter, getDTagV } from './Components/Tagkv/utils';
import { TypeTreeNode } from './Components/TreeSelect/types';
import { normalizeEndpointCounters } from './utils';
import { comparisonOptions } from './config';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  constructor(public instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>, public backendSrv: BackendSrv) {
    super(instanceSettings);
  }

  treeData: TypeTreeNode[] = [];

  _request(options: BackendSrvRequest) {
    const { id } = this.instanceSettings;
    const prefix = `/api/datasources/proxy/${id}`;

    return this.backendSrv
      .datasourceRequest({
        ...options,
        url: `${prefix}${options.url}`,
      })
      .then(res => {
        if (res.data.err) {
          message.warning(res.data.err);
        }
        return res.data.dat;
      })
      .catch(err => {
        if (_.get(err, 'data.err')) {
          message.error(_.get(err, 'data.err'));
        } else {
          message.error(err.statusText);
        }
      });
  }

  fetchTreeData() {
    return this._request({
      url: '/v1/portal/tree',
      method: 'GET',
    })
      .then(res => {
        const treeData = _.map(res, item => {
          return {
            text: item.path,
          };
        });
        this.treeData = res;
        return treeData;
      })
      .catch(err => {})
      .finally(() => {});
  }

  fetchEndpointsData(nid: number) {
    return this._request({
      url: `/v1/portal/endpoints/bynodeids?ids=${nid}`,
    })
      .then(res => {
        return _.map(res, 'ident');
      })
      .catch(err => {})
      .finally(() => {});
  }

  fetchCountersData(reqData: any) {
    return this._request({
      url: '/api/index/counter/fullmatch',
      method: 'POST',
      data: JSON.stringify(reqData),
    })
      .then(res => {
        return res;
      })
      .catch(err => {})
      .finally(() => {});
  }

  fetchSeriesData(reqData: any) {
    return this._request({
      url: '/api/transfer/data/ui',
      method: 'POST',
      data: JSON.stringify(reqData),
    })
      .then(res => {
        return _.filter(res, (item: any) => {
          return !_.isEmpty(item.values);
        });
      })
      .catch(err => {})
      .finally(() => {});
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const templateSrv = getTemplateSrv();
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();
    let data: any[] = [];

    for (let targetIdx = 0; targetIdx < options.targets.length; targetIdx++) {
      const query = _.defaults(options.targets[targetIdx], defaultQuery);
      const { selectedNid, selectedMetric, tagkv, aggrFunc, groupKey, comparison } = query;
      let { selectedEndpointsIdent, selectedTagkv } = query;
      if (hasDtag(selectedEndpointsIdent)) {
        const endpointsData = (await this.fetchEndpointsData(selectedNid)) as string[];
        const dTagvKeyword = getDTagvKeyword(selectedEndpointsIdent[0]) as string;
        selectedEndpointsIdent = dFilter(dTagvKeyword, selectedEndpointsIdent[0], endpointsData);
      } else if (hasVariable(selectedEndpointsIdent)) {
        const replaced = templateSrv.replace(selectedEndpointsIdent[0], undefined, (result: any) => {
          return result;
        });
        selectedEndpointsIdent = _.split(replaced, ',');
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
          endpoints: selectedEndpointsIdent,
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
    return this._request({
      url: '/v1/portal/tree',
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
