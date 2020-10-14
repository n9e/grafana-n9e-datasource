import get from 'lodash/get';
import map from 'lodash/map';
import split from 'lodash/split';
import filter from 'lodash/filter';
import isEmpty from 'lodash/isEmpty';
import message from 'antd/lib/message';
import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, BackendSrvRequest, getTemplateSrv } from '@grafana/runtime';
import { hasDtag, hasVariable, getDTagvKeyword, dFilter } from './Components/Tagkv/utils';
import { MyDataSourceOptions, MyQuery } from './types';

export function request(
  instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>,
  backendSrv: BackendSrv,
  options: BackendSrvRequest
) {
  const prefix = `/api/datasources/proxy/${instanceSettings.id}`;

  return backendSrv
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
      if (get(err, 'data.err')) {
        message.error(get(err, 'data.err'));
      } else {
        message.error(err.statusText);
      }
    });
}

export function fetchTreeData(
  instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>,
  backendSrv: BackendSrv
) {
  const { version } = instanceSettings.jsonData;
  return request(instanceSettings, backendSrv, {
    url: version === 'v3' ? '/api/rdb/tree' : '/v1/portal/tree',
    method: 'GET',
  });
}

export async function fetchEndpointsData(
  instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>,
  backendSrv: BackendSrv,
  nid: number
) {
  const { version } = instanceSettings.jsonData;
  let endpoints = [];
  try {
    const res = await request(instanceSettings, backendSrv, {
      url: version === 'v3' ? `/api/rdb/node/${nid}/resources?limit=5000` : `/v1/portal/endpoints/bynodeids?ids=${nid}`,
      method: 'GET',
    });
    if (version === 'v3') {
      endpoints = map(res.list, 'ident');
    } else {
      endpoints = map(res, 'ident');
    }
  } catch (err) {
    console.log(err);
  }
  return endpoints;
}

export function fetchMetricsData(
  instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>,
  backendSrv: BackendSrv,
  endpointsIdent: Array<string | number>,
  endpointsData: string[],
  category: 0 | 1
) {
  const templateSrv = getTemplateSrv();
  let selectedEndpointsIdent = endpointsIdent as string[];
  const endpointsKey = category === 0 ? 'endpoints' : 'nids';

  if (endpointsKey === 'endpoints') {
    if (hasDtag(selectedEndpointsIdent)) {
      const dTagvKeyword = getDTagvKeyword(selectedEndpointsIdent[0]) as string;
      selectedEndpointsIdent = dFilter(dTagvKeyword, selectedEndpointsIdent[0], endpointsData);
    } else if (hasVariable(selectedEndpointsIdent)) {
      const replaced = templateSrv.replace(selectedEndpointsIdent[0], undefined, (result: any) => {
        return result;
      });
      selectedEndpointsIdent = split(replaced, ',');
    }
  }

  return request(instanceSettings, backendSrv, {
    url: endpointsKey === 'endpoints' ? '/api/index/metrics' : '/api/mon/index/metrics',
    method: 'POST',
    data: JSON.stringify({
      [endpointsKey]: map(selectedEndpointsIdent, item => String(item)),
    }),
  }).then(res => {
    return res.metrics;
  });
}

export function fetchTagkvData(
  instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>,
  backendSrv: BackendSrv,
  query: MyQuery,
  metrics: Array<string | undefined>,
  endpointsData: string[],
  category = 0 | 1
) {
  const templateSrv = getTemplateSrv();
  let { selectedEndpointsIdent, selectedNid } = query;
  const endpointsKey = category === 0 ? 'endpoints' : 'nids';

  if (endpointsKey === 'endpoints') {
    if (hasDtag(selectedEndpointsIdent)) {
      const dTagvKeyword = getDTagvKeyword(selectedEndpointsIdent[0]) as string;
      selectedEndpointsIdent = dFilter(dTagvKeyword, selectedEndpointsIdent[0], endpointsData);
    } else if (hasVariable(selectedEndpointsIdent)) {
      const replaced = templateSrv.replace(selectedEndpointsIdent[0], undefined, (result: any) => {
        return result;
      });
      selectedEndpointsIdent = split(replaced, ',');
    }
  } else if (endpointsKey === 'nids') {
    selectedEndpointsIdent = map(selectedNid, item => String(item));
  }

  return request(instanceSettings, backendSrv, {
    url: endpointsKey === 'endpoints' ? '/api/index/tagkv' : '/api/mon/index/tagkv',
    method: 'POST',
    data: JSON.stringify({
      [endpointsKey]: selectedEndpointsIdent,
      metrics,
    }),
  }).then(res => {
    // TODO: only single metric now.
    return res[0];
  });
}

export function fetchCountersData(
  instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>,
  backendSrv: BackendSrv,
  reqData: any
) {
  const { version } = instanceSettings.jsonData;
  return request(instanceSettings, backendSrv, {
    url: '/api/index/counter/fullmatch',
    method: 'POST',
    data: JSON.stringify(reqData),
  }).then(res => {
    if (version === 'v3') {
      return res.list;
    }
    return res;
  });
}

export function fetchSeriesData(
  instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>,
  backendSrv: BackendSrv,
  reqData: any
) {
  return request(instanceSettings, backendSrv, {
    url: '/api/transfer/data/ui',
    method: 'POST',
    data: JSON.stringify(reqData),
  }).then((res: any) => {
    return filter(res, (item: any) => {
      return !isEmpty(item.values);
    });
  });
}
