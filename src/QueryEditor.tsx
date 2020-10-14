import _ from 'lodash';
import React, { PureComponent } from 'react';
import Input from 'antd/lib/input';
import Select from 'antd/lib/select';
import Radio from 'antd/lib/radio';
import { LegacyForms } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './DataSource';
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';
import TreeSelect, { normalizeTreeData } from './Components/TreeSelect';
import { TypeTreeNode } from './Components/TreeSelect/types';
import Tagkv from './Components/Tagkv';
import { TypeTagkv } from './Components/Tagkv/types';
import { aggrOptions, comparisonOptions } from './config';
import { fetchTreeData, fetchEndpointsData, fetchMetricsData, fetchTagkvData } from './services';
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

  componentDidMount() {
    this.fetchData();
  }

  async fetchData() {
    const query = _.defaults(this.props.query, defaultQuery);
    const { selectedNid, selectedEndpointsIdent, selectedMetric, category } = query;
    try {
      await this.fetchTreeData();
      if (selectedNid) {
        await this.fetchEndpointsData(selectedNid[0]);
      }
      if (!_.isEmpty(selectedEndpointsIdent)) {
        await this.fetchMetricsData(selectedEndpointsIdent, category);
      }
      if (selectedMetric) {
        await this.fetchTagkvData([selectedMetric], category, true);
      }
    } catch (e) {
      console.log(e);
    }
  }

  fetchTreeData() {
    const { instanceSettings, backendSrv } = this.props.datasource;
    this.setState({ treeDataLoading: true });
    fetchTreeData(instanceSettings, backendSrv)
      .then(res => {
        this.setState({ treeData: normalizeTreeData(res) });
      })
      .finally(() => {
        this.setState({ treeDataLoading: false });
      });
  }

  fetchEndpointsData(nid: number) {
    const { instanceSettings, backendSrv } = this.props.datasource;
    const { category } = this.props.query;
    this.setState({ endpointsDataLoading: true });
    return fetchEndpointsData(instanceSettings, backendSrv, nid)
      .then(res => {
        this.setState({ endpointsData: res });
        if (category === 0) {
          this.fetchMetricsData(res, category);
        } else if (category === 1) {
          this.fetchMetricsData([nid], category);
        }
      })
      .finally(() => {
        this.setState({ endpointsDataLoading: false });
      });
  }

  fetchMetricsData(endpointsIdent: string[] | number[], category: 0 | 1) {
    const { instanceSettings, backendSrv } = this.props.datasource;
    const { endpointsData } = this.state;

    this.setState({ metricsDataLoading: true });
    return fetchMetricsData(instanceSettings, backendSrv, endpointsIdent, endpointsData, category)
      .then(res => {
        this.setState({ metricsData: res });
      })
      .finally(() => {
        this.setState({ metricsDataLoading: false });
      });
  }

  fetchTagkvData(metrics: Array<string | undefined>, category: 0 | 1, isFirstLoad = false) {
    const { instanceSettings, backendSrv } = this.props.datasource;
    const query = _.defaults(this.props.query, defaultQuery);
    const { selectedTagkv } = query;
    const { endpointsData } = this.state;
    return fetchTagkvData(instanceSettings, backendSrv, query, metrics, endpointsData, category)
      .then(res => {
        const tagkvData = _.get(res, 'tagkv');
        this.setState({ tagkvData });
        const { onChange, query, onRunQuery } = this.props;

        // TODO: 逻辑不清
        let newSelectedTagkv = _.map(tagkvData, item => {
          return {
            tagk: item.tagk,
            tagv: ['=all'],
          };
        });
        if (isFirstLoad) {
          newSelectedTagkv = _.isEmpty(selectedTagkv) ? tagkvData : selectedTagkv;
        }

        onChange({
          ...query,
          selectedTagkv: newSelectedTagkv,
          tagkv: tagkvData,
          _nids: _.map(res.nids, item => String(item)),
        });
        onRunQuery();
      })
      .finally(() => {
        this.setState({ tagkvDataLoading: false });
      });
  }

  render() {
    const { instanceSettings } = this.props.datasource;
    const { version } = instanceSettings.jsonData;
    const query = _.defaults(this.props.query, defaultQuery);
    const {
      category,
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
        {version === 'v3' ? (
          <div className="gf-form">
            <FormField
              className="n9e-form-field-control-fullWidth"
              labelWidth={8}
              label="type"
              inputEl={
                <Radio.Group
                  style={{ marginTop: 5 }}
                  value={category}
                  onChange={e => {
                    const { onChange, query } = this.props;
                    const { value } = e.target;
                    onChange({
                      ...query,
                      category: value,
                      selectedEndpointsIdent: [],
                      selectedMetric: '',
                      selectedTagkv: [],
                    });
                    this.setState({
                      metricsData: [],
                      tagkvData: [],
                    });
                    if (value === 0) {
                      this.fetchEndpointsData(selectedNid[0]);
                    } else if (value === 1) {
                      this.fetchMetricsData(selectedNid, 1);
                    }
                  }}
                >
                  <Radio value={0}>Hosts</Radio>
                  <Radio value={1}>No-Hosts</Radio>
                </Radio.Group>
              }
            />
          </div>
        ) : null}
        <div className="gf-form">
          <FormField
            className="n9e-form-field-control-fullWidth"
            labelWidth={8}
            label="node path"
            inputEl={
              <TreeSelect
                treeData={treeData}
                loading={treeDataLoading}
                multiple={category === 1}
                value={category === 0 && selectedNid !== undefined ? selectedNid[0] : selectedNid}
                onChange={val => {
                  const { onChange, query } = this.props;
                  const newSelectedNid = category === 0 ? ([val] as number[]) : (val as number[]);
                  onChange({
                    ...query,
                    selectedNid: newSelectedNid,
                    selectedEndpointsIdent: ['=all'],
                    selectedMetric: '',
                    selectedTagkv: [],
                  });
                  this.setState({
                    metricsData: [],
                    tagkvData: [],
                  });
                  if (category === 0) {
                    this.fetchEndpointsData(val as number);
                  } else if (category === 1) {
                    this.fetchMetricsData(val as number[], 1);
                  }
                }}
              />
            }
          />
        </div>
        {category === 0 ? (
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
                  this.fetchMetricsData(tagv, 0);
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
        ) : null}
        <div className="gf-form">
          <FormField
            className="n9e-form-field-control-fullWidth"
            labelWidth={8}
            label="metric"
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
                  });
                  this.fetchTagkvData([val], category);
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
                    tagv: currentTagkv ? currentTagkv.tagv : [],
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
            label="aggr"
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
              label="groupBy"
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
            label="comparison"
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
