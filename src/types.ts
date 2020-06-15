import { DataQuery, DataSourceJsonData } from '@grafana/data';
import { TypeTagkv } from './Components/Tagkv/types';

export interface MyQuery extends DataQuery {
  selectedNid: number;
  selectedEndpointsIdent: string[];
  selectedMetric: string;
  selectedTagkv: TypeTagkv[];
  tagkv: TypeTagkv[];
  aggrFunc: 'sum' | 'avg' | 'max' | 'min';
  groupKey: string[];
  comparison: number[];
}

export const defaultQuery: Partial<MyQuery> = {
  selectedEndpointsIdent: ['=all'],
  selectedTagkv: [],
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  path: string;
  apiKey: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey?: string;
}
