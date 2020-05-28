import _ from 'lodash';
import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';
import { BackendSrv, BackendSrvRequest } from '@grafana/runtime';
import { message } from 'antd';

import { MyQuery, MyDataSourceOptions, defaultQuery } from './types';
import { hasDtag, getDTagvKeyword, dFilter } from './Components/Tagkv/utils';
import { normalizeEndpointCounters } from './utils';
import { comparisonOptions } from './config';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  constructor(public instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>, public backendSrv: BackendSrv) {
    super(instanceSettings);
  }

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
        return res;
      })
      .catch(err => {})
      .finally(() => {});
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();
    let data: any[] = [];

    for (let targetIdx = 0; targetIdx < options.targets.length; targetIdx++) {
      const query = _.defaults(options.targets[targetIdx], defaultQuery);
      const { selectedNid, selectedMetric, selectedTagkv, aggrFunc, groupKey, comparison } = query;
      let { selectedEndpointsIdent } = query;
      if (hasDtag(selectedEndpointsIdent)) {
        const endpointsData = (await this.fetchEndpointsData(selectedNid)) as string[];
        const dTagvKeyword = getDTagvKeyword(selectedEndpointsIdent[0]) as string;
        selectedEndpointsIdent = dFilter(dTagvKeyword, selectedEndpointsIdent[0], endpointsData);
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
