/**
 * ## 多选组件
 * 面向待选择的数据长度过大提供分页功能，以及搜索和全选/非全选功能。
 * ### Props:
 * | 属性 | 说明 | 类型 | 默认值 |
 * | data            | 选择原数据      | Array | [] |
 * | selected        | 已选项          | Array | [] |
 * | defaultPageSize | 默认每页显示数量 | Number | 5 |
 * | onChange        | 选择更改回调    | Function(selected, currentItemVa, currentItemChecked) | noop |
 * | onRemoveAll     | 删除所有选择    | Function | noop |
 * | onCurrentPageSelectAll | 全选当页选项    | Function(currentPageSelected) | noop |
 * | onSelectAll | 全选当页选项    | Function(currentPageSelected) | noop |
 * | onSearch        | 搜索回调       | Function(searchVal, filteredData) | noop |
 * ### Methods:
 * - getSelected 获取已选项
 * - setSelected 设定已选项
 */

import React, { Component } from 'react';
import { Row, Col, Input, Button, Pagination, Checkbox, Popover, Tag, message } from 'antd';
import _ from 'lodash';

interface TypeProps {
  width: string | number;
  data: string[];
  selected: string[];
  selectedMaxDisplayNum: number;
  manualEntry: boolean;
  defaultPageSize: number;
  onChange: (vals: string[], val?: string, checked?: boolean) => void;
  onRemoveAll: () => void;
  onCurrentPageSelectAll: (vals: string[]) => void;
  onSelectAll: (vals: string[]) => void;
  onSearch: (searchVal: string, data: string[]) => void;
  onSelectedClick: (val: string) => void;
}

interface TypeState {
  current: number;
  width: number;
  searchVal: string;
  manualVisible: boolean;
  manualVal: string;
  selected: string[];
  data: string[];
  defaultPageSize: number;
}

const TextArea = Input.TextArea ? Input.TextArea : Input;

class Multipicker extends Component<TypeProps, TypeState> {
  multipicker: any;

  static defaultProps = {
    width: 400,
    data: [],
    selected: [],
    selectedMaxDisplayNum: 100,
    manualEntry: false,
    defaultPageSize: 5,
    onChange: () => {},
    onRemoveAll: () => {},
    onCurrentPageSelectAll: () => {},
    onSelectAll: () => {},
    onSearch: () => {},
    onSelectedClick: () => {},
  };

  state = {
    current: 1,
    width: 400,
    searchVal: '',
    manualVisible: false,
    manualVal: '',
    selected: [],
    data: [],
    defaultPageSize: 5,
  } as TypeState;

  componentWillMount() {
    this.initialState(this.props);
  }

  componentDidMount() {
    const $multipicker = this.multipicker;
    const width = $multipicker.clientWidth;

    this.setState({ width });
  }

  componentWillReceiveProps(nextProps: TypeProps) {
    this.initialState(nextProps);
  }

  getSelected() {
    return _.clone(this.state.selected);
  }

  setSelected(selected: string[]) {
    this.setState({ selected });
  }

  initialState(props: TypeProps) {
    const { data, defaultPageSize, selected } = props;

    this.setState({
      data: _.uniq(data),
      defaultPageSize,
      selected,
    });
  }

  handleChangeCheckbox = (e: any) => {
    const { selected } = this.state;
    const { checked, value } = e.target;
    const newSelected = _.clone(selected);

    if (checked) {
      newSelected.push(value);
    } else {
      _.remove(newSelected, n => n === value);
    }
    this.setState(
      {
        selected: newSelected,
      },
      () => {
        this.props.onChange.call(this, newSelected, value, checked);
      }
    );
  };

  removeAll = () => {
    this.setState({ selected: [] }, () => {
      this.props.onRemoveAll.call(this);
      this.props.onChange.call(this, []);
    });
  };

  handleManualEntry = () => {
    const { manualVal } = this.state;
    const arrVal = manualVal ? _.split(manualVal, '\n') : [];
    // const newSelected = _.uniq(_.concat([], arrVal, selected));
    const newSelected = arrVal; // 手动输入的会覆盖已有的值

    _.remove(newSelected, o => o === '');

    this.setState(
      {
        selected: newSelected,
        manualVisible: false,
        manualVal: '',
      },
      () => {
        this.props.onChange.call(this, newSelected);
      }
    );
  };

  currentPageSelectAll = () => {
    const { selected, current, defaultPageSize } = this.state;
    const data = this.filterData();
    const selectedList = _.filter(data, (item, i) => {
      return i >= (current - 1) * defaultPageSize && i < current * defaultPageSize;
    });
    let newSelected = _.clone(selected);

    newSelected = _.uniq(newSelected.concat(selectedList));
    this.setState({ selected: newSelected }, () => {
      this.props.onCurrentPageSelectAll.call(this, selectedList);
      this.props.onChange.call(this, newSelected);
    });
  };

  selectAll = () => {
    const { selected, data, searchVal } = this.state;
    let selectedList = _.cloneDeep(data);

    if (data.length > 500) {
      selectedList = selectedList.splice(0, 500);
      message.warning('Can only select a maximum of 500');
    }
    if (searchVal) {
      selectedList = _.uniq(selected.concat(this.filterData()));
    }
    this.setState(
      {
        selected: selectedList,
      },
      () => {
        this.props.onSelectAll.call(this, selectedList);
        this.props.onChange.call(this, selectedList);
      }
    );
  };

  search = (e: any) => {
    const searchVal = e.target.value;

    this.setState(
      {
        searchVal,
        current: 1,
      },
      () => {
        this.props.onSearch.call(this, searchVal, this.filterData());
      }
    );
  };

  paginationChange = (current: number) => {
    this.setState({ current });
  };

  createSelectedList = () => {
    const { selected } = this.state;
    const filtered = _.filter(selected, (item, i) => i < this.props.selectedMaxDisplayNum);
    const onClose = (e: any, value: string) => {
      const newSelected = _.filter(selected, n => n !== value);
      this.setState({ selected: newSelected }, () => {
        this.props.onChange.call(this, newSelected, value, false);
      });
    };

    const lis = _.map(filtered, (item, i) => {
      return (
        <Tag
          key={i}
          title={item}
          closable
          visible
          onClick={() => {
            this.props.onSelectedClick(item);
          }}
          onClose={(e: any) => {
            onClose(e, item);
          }}
        >
          {item}
        </Tag>
      );
    });

    if (filtered.length < selected.length) {
      lis.push(<span key="more">...</span>);
    }

    return lis;
  };

  createOptionList = (data: string[]) => {
    const { selected, current, defaultPageSize, width } = this.state;
    const optionList: any[] = [];

    _.each(data, (item, i) => {
      if (i >= (current - 1) * defaultPageSize && i < current * defaultPageSize) {
        optionList.push(
          <li className="multipicker-option" key={i}>
            <Checkbox value={item} onChange={this.handleChangeCheckbox} checked={selected.indexOf(item) > -1}>
              <span
                title={item}
                className="multipicker-tagItem"
                style={{
                  maxWidth: width - 70,
                }}
              >
                {item}
              </span>
            </Checkbox>
          </li>
        );
      }
    });
    return optionList;
  };

  filterData() {
    const { data, searchVal } = this.state;

    try {
      const reg = new RegExp(searchVal, 'i');
      return _.filter(data, item => {
        return reg.test(item);
      });
    } catch (e) {
      return [];
    }
  }

  render() {
    const { manualEntry } = this.props;
    const { current, defaultPageSize, selected = [] } = this.state;
    const data = this.filterData();

    return (
      <div
        className="multipicker-panel"
        ref={ref => {
          this.multipicker = ref;
        }}
        style={{ width: this.props.width }}
      >
        <div className="multipicker-selected-list-box">
          <Row>
            <Col span={14}>
              <strong>selected({selected.length})：</strong>
              <a className="remove-all" onClick={this.removeAll}>
                clear
              </a>
              {manualEntry && (
                <Popover
                  placement="topLeft"
                  trigger="click"
                  visible={this.state.manualVisible}
                  onVisibleChange={visible => {
                    this.setState({ manualVisible: visible });
                  }}
                  content={
                    <div>
                      <div>Split multiple values ​​by newline</div>
                      <TextArea
                        type="textarea"
                        placeholder="xx.xx.xx.xx&#10;xx.xx.xx.xx"
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        style={{ width: 230 }}
                        value={this.state.manualVal}
                        onChange={(e: any) => {
                          this.setState({ manualVal: e.target.value });
                        }}
                      />
                      <div style={{ marginTop: 5 }}>
                        <Button size="small" onClick={this.handleManualEntry}>
                          Ok
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <a
                    style={{ paddingLeft: 10 }}
                    onClick={() => {
                      this.setState({ manualVisible: !this.state.manualVisible });
                    }}
                  >
                    setValue
                  </a>
                </Popover>
              )}
            </Col>
          </Row>
          <ul className="multipicker-selected-list">{this.createSelectedList()}</ul>
        </div>
        <div className="multipicker-option-list-box">
          <Row>
            <Col span={16}>
              <strong>total({data.length})：</strong>
              <a className="select-all-currentPage" onClick={this.currentPageSelectAll} style={{ paddingRight: 10 }}>
                currentPage
              </a>
              <a className="select-all" onClick={this.selectAll}>
                all
              </a>
            </Col>
            <Col span={8}>
              <div className="multipicker-search">
                <Input
                  size="small"
                  type="text"
                  className="keyword"
                  placeholder="support regular"
                  onChange={this.search}
                />
              </div>
            </Col>
          </Row>
          <ul className="multipicker-option-list">{this.createOptionList(data)}</ul>
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <Pagination
              size="small"
              current={current}
              defaultPageSize={defaultPageSize}
              total={data.length}
              onChange={this.paginationChange}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default Multipicker;
