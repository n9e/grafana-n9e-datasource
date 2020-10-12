import { DataQuery, DataSourceJsonData } from '@grafana/data';
import { TypeTagkv } from './Components/Tagkv/types';

export interface MyQuery extends DataQuery {
  category: 0 | 1;
  selectedNid: number[];
  selectedEndpointsIdent: string[]; // for cate 0
  _nids: string[]; // for cate 1 设备无关类别下临时缓存已选节点下的所有 nids
  selectedMetric: string;
  selectedTagkv: TypeTagkv[];
  tagkv: TypeTagkv[];
  aggrFunc: 'sum' | 'avg' | 'max' | 'min';
  groupKey: string[];
  comparison: number[];
}

export const defaultQuery: Partial<MyQuery> = {
  category: 0,
  selectedEndpointsIdent: ['=all'],
  selectedTagkv: [],
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  version: string;
  path: string;
  apiKey: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey?: string;
}
