import _ from 'lodash';
import React, { PureComponent } from 'react';
import { Input, Select, message } from 'antd';
import { LegacyForms } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { BackendSrvRequest } from '@grafana/runtime';
import { DataSource } from './DataSource';
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';
import TreeSelect, { normalizeTreeData } from './Components/TreeSelect';
import { TypeTreeNode } from './Components/TreeSelect/types';
import Tagkv from './Components/Tagkv';
import { TypeTagkv } from './Components/Tagkv/types';
import { hasDtag, getDTagvKeyword, dFilter } from './Components/Tagkv/utils';
import { aggrOptions, comparisonOptions } from './config';
import './less/style.less';
import './less/antd.dark.less';

const { FormField } = LegacyForms;
type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;
interface State {
  treeData: TypeTreeNode[];
  treeDataLoading: boolean;
  endpointsData: string[];
  endpointsDataLoading: boolean;
  metricsData: string[];
  metricsDataLoading: boolean;
  tagkvData: TypeTagkv[];
  tagkvDataLoading: boolean;
}

export class QueryEditor extends PureComponent<Props> {
  state: State = {
    treeData: [],
    treeDataLoading: false,
    endpointsData: [],
    endpointsDataLoading: false,
    metricsData: [],
    metricsDataLoading: false,
    tagkvData: [],
    tagkvDataLoading: false,
  };

  _request(options: BackendSrvRequest) {
    const { instanceSettings, backendSrv } = this.props.datasource;
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
        if (_.get(err, 'data.err')) {
          message.error(_.get(err, 'data.err'));
        } else {
          message.error(err.statusText);
        }
      });
  }

  componentDidMount() {
    this.fetchData();
  }

  async fetchData() {
    const query = _.defaults(this.props.query, defaultQuery);
    const { selectedNid, selectedEndpointsIdent, selectedMetric } = query;
    try {
      await this.fetchTreeData();
      if (selectedNid) {
        await this.fetchEndpointsData(selectedNid);
      }
      if (selectedEndpointsIdent) {
        await this.fetchMetricsData(selectedEndpointsIdent);
      }
      if (selectedMetric) {
        await this.fetchTagkvData([selectedMetric]);
      }
    } catch (e) {
      console.log(e);
    }
  }

  fetchTreeData() {
    this.setState({ treeDataLoading: true });
    return this._request({
      url: '/v1/portal/tree',
      method: 'GET',
    })
      .then(res => {
        this.setState({ treeData: normalizeTreeData(res) });
      })
      .catch(err => {})
      .finally(() => {
        this.setState({ treeDataLoading: false });
      });
  }

  fetchEndpointsData(nid: number) {
    this.setState({ endpointsDataLoading: true });
    return this._request({
      url: `/v1/portal/endpoints/bynodeids?ids=${nid}`,
      method: 'GET',
    })
      .then(res => {
        const endpointsData = _.map(res, 'ident');
        this.setState({ endpointsData });
        this.fetchMetricsData(endpointsData);
      })
      .catch(err => {})
      .finally(() => {
        this.setState({ endpointsDataLoading: false });
      });
  }

  fetchMetricsData(endpointsIdent: string[]) {
    const { endpointsData } = this.state;
    let selectedEndpointsIdent = endpointsIdent;
    this.setState({ metricsDataLoading: true });
    if (hasDtag(selectedEndpointsIdent)) {
      const dTagvKeyword = getDTagvKeyword(selectedEndpointsIdent[0]) as string;
      selectedEndpointsIdent = dFilter(dTagvKeyword, selectedEndpointsIdent[0], endpointsData);
    }
    return this._request({
      url: '/api/index/metrics',
      method: 'POST',
      data: JSON.stringify({
        endpoints: selectedEndpointsIdent,
      }),
    })
      .then(res => {
        this.setState({ metricsData: res.metrics });
      })
      .catch(err => {})
      .finally(() => {
        this.setState({ metricsDataLoading: false });
      });
  }

  fetchTagkvData(metrics: Array<string | undefined>) {
    const query = _.defaults(this.props.query, defaultQuery);
    let { selectedEndpointsIdent } = query;
    const { endpointsData } = this.state;
    this.setState({ tagkvDataLoading: true });
    if (hasDtag(selectedEndpointsIdent)) {
      const dTagvKeyword = getDTagvKeyword(selectedEndpointsIdent[0]) as string;
      selectedEndpointsIdent = dFilter(dTagvKeyword, selectedEndpointsIdent[0], endpointsData);
    }
    return this._request({
      url: '/api/index/tagkv',
      method: 'POST',
      data: JSON.stringify({
        endpoints: selectedEndpointsIdent,
        metrics,
      }),
    })
      .then(res => {
        const tagkvData = _.get(res, '[0].tagkv'); // TODO: single metric
        this.setState({ tagkvData });
        const { onChange, query, onRunQuery } = this.props;
        onChange({ ...query, selectedTagkv: tagkvData });
        onRunQuery();
      })
      .catch(err => {})
      .finally(() => {
        this.setState({ tagkvDataLoading: false });
      });
  }

  render() {
    const query = _.defaults(this.props.query, defaultQuery);
    const {
      selectedNid,
      selectedEndpointsIdent,
      selectedMetric,
      selectedTagkv,
      aggrFunc,
      groupKey,
      comparison,
    } = query;
    const { treeData, treeDataLoading, endpointsData, metricsData, metricsDataLoading, tagkvData } = this.state;

    return (
      <div className="n9e-query-editor">
        <div className="gf-form">
          <FormField
            // tooltip="" // 定义一些提示
            className="n9e-form-field-control-fullWidth"
            labelWidth={8}
            label="Node path"
            inputEl={
              <TreeSelect
                treeData={treeData}
                loading={treeDataLoading}
                value={selectedNid}
                onChange={val => {
                  const { onChange, query } = this.props;
                  onChange({
                    ...query,
                    selectedNid: val,
                    selectedEndpointsIdent: ['=all'],
                    selectedMetric: '',
                    selectedTagkv: [],
                  });
                  this.setState({
                    metricsData: [],
                    tagkvData: [],
                  });
                  this.fetchEndpointsData(val);
                }}
              />
            }
          />
        </div>
        <div className="gf-form">
          <Tagkv
            type="popover"
            data={[
              {
                tagk: 'endpoint',
                tagv: endpointsData,
              },
            ]}
            selectedTagkv={[
              {
                tagk: 'endpoint',
                tagv: selectedEndpointsIdent,
              },
            ]}
            onChange={(tagk, tagv) => {
              const { onChange, query } = this.props;
              if (!_.isEqual(tagv, selectedEndpointsIdent)) {
                onChange({
                  ...query,
                  selectedEndpointsIdent: tagv,
                  selectedMetric: '',
                  selectedTagkv: [],
                });
                this.setState({
                  tagkvData: [],
                });
                this.fetchMetricsData(tagv);
              }
            }}
            renderItem={(tagk, tagv, selectedTagv, show) => {
              return (
                <Input
                  style={{ width: '100%' }}
                  value={_.join(_.slice(selectedTagv, 0, 40), ', ')}
                  onClick={() => {
                    show(tagk);
                  }}
                />
              );
            }}
            wrapInner={(content, tagk) => {
              return (
                <FormField
                  className="n9e-form-field-control-fullWidth"
                  labelWidth={8}
                  label="Endpoints"
                  inputEl={content}
                />
              );
            }}
          />
        </div>
        <div className="gf-form">
          <FormField
            className="n9e-form-field-control-fullWidth"
            labelWidth={8}
            label="Metrics"
            inputEl={
              <Select
                showSearch
                style={{ width: '100%' }}
                loading={metricsDataLoading}
                value={selectedMetric}
                onChange={(val: string) => {
                  const { onChange, query } = this.props;
                  onChange({
                    ...query,
                    selectedMetric: val,
                    selectedTagkv: [],
                  });
                  this.fetchTagkvData([val]);
                }}
              >
                {_.map(metricsData, item => {
                  return (
                    <Select.Option key={item} value={item}>
                      {item}
                    </Select.Option>
                  );
                })}
              </Select>
            }
          />
        </div>
        {_.map(tagkvData, item => {
          const currentTagkv = _.find(selectedTagkv, { tagk: item.tagk });
          return (
            <div className="gf-form">
              <Tagkv
                type="popover"
                data={[
                  {
                    tagk: item.tagk,
                    tagv: item.tagv,
                  },
                ]}
                selectedTagkv={[
                  {
                    tagk: item.tagk,
                    tagv: currentTagkv ? currentTagkv.tagv : ['=all'],
                  },
                ]}
                onChange={(tagk, tagv) => {
                  const { onChange, query, onRunQuery } = this.props;
                  let newSelectedTagkv = selectedTagkv;
                  if (currentTagkv) {
                    newSelectedTagkv = _.map(selectedTagkv, tag => {
                      if (tag.tagk === tagk) {
                        return {
                          tagk,
                          tagv,
                        };
                      }
                      return tag;
                    });
                  } else {
                    newSelectedTagkv = [...selectedTagkv, ...[{ tagk, tagv }]];
                  }
                  onChange({ ...query, selectedTagkv: newSelectedTagkv });
                  onRunQuery();
                }}
                renderItem={(tagk, tagv, selectedTagv, show) => {
                  return (
                    <Input
                      style={{ width: '100%' }}
                      value={_.join(_.slice(selectedTagv, 0, 40), ', ')}
                      onClick={() => {
                        show(tagk);
                      }}
                    />
                  );
                }}
                wrapInner={(content, tagk) => {
                  return (
                    <FormField
                      className="n9e-form-field-control-fullWidth"
                      labelWidth={8}
                      label={tagk}
                      inputEl={content}
                    />
                  );
                }}
              />
            </div>
          );
        })}
        <div className="gf-form">
          <FormField
            labelWidth={8}
            label="Aggr"
            inputEl={
              <Select
                showSearch
                allowClear
                style={{ minWidth: 80, marginRight: 4 }}
                value={aggrFunc}
                onChange={(val: any) => {
                  const { onChange, query, onRunQuery } = this.props;
                  onChange({
                    ...query,
                    aggrFunc: val,
                  });
                  onRunQuery();
                }}
              >
                {_.map(aggrOptions, item => {
                  return (
                    <Select.Option key={item.value} value={item.value}>
                      {item.value}
                    </Select.Option>
                  );
                })}
              </Select>
            }
          />
          {aggrFunc ? (
            <FormField
              labelWidth={8}
              label="GroupBy"
              inputEl={
                <Select
                  showSearch
                  allowClear
                  dropdownMatchSelectWidth={false}
                  style={{ minWidth: 80, marginRight: 4 }}
                  mode="multiple"
                  value={groupKey}
                  onChange={(val: any) => {
                    const { onChange, query, onRunQuery } = this.props;
                    onChange({
                      ...query,
                      groupKey: val,
                    });
                    onRunQuery();
                  }}
                >
                  {_.map(tagkvData, item => {
                    return (
                      <Select.Option key={item.tagk} value={item.tagk}>
                        {item.tagk}
                      </Select.Option>
                    );
                  })}
                </Select>
              }
            />
          ) : null}
          <FormField
            labelWidth={8}
            label="Comparison"
            inputEl={
              <Select
                showSearch
                allowClear
                style={{ minWidth: 110 }}
                mode="multiple"
                value={comparison}
                onChange={(val: any) => {
                  const { onChange, query, onRunQuery } = this.props;
                  onChange({
                    ...query,
                    comparison: val,
                  });
                  onRunQuery();
                }}
              >
                {_.map(comparisonOptions, item => {
                  return (
                    <Select.Option key={item.value} value={item.value}>
                      {item.labelEn}
                    </Select.Option>
                  );
                })}
              </Select>
            }
          />
        </div>
      </div>
    );
  }
}
