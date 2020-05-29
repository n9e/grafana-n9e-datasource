import React, { Component } from 'react';
import update from 'react-addons-update';
import _ from 'lodash';
import { Input, Button, Modal, Popover, Switch } from 'antd';
import Multipicker from '../Multipicker';
import { hasDtag, sortTagkvs } from './utils';
import { TypeTagkv } from './types';

interface Props {
  type: string;
  data: TypeTagkv[]; // tagkv
  selectedTagkv: TypeTagkv[];
  onChange: (key: string, tagv: string[], selectedTagkv: TypeTagkv[]) => void;
  renderItem: (tagk: string, tagv: string[], realSelectedTagv: string[], show?: any) => React.ReactNode;
  wrapInner: (itemContent: React.ReactNode, tagk: string, tagv: string[], selectedTagv: string[]) => void;
}

interface State {
  data: TypeTagkv[];
  selectedTagkv: TypeTagkv[];
  dynamicSwitch: boolean;
  [index: string]: any;
}

export default class Tagkv extends Component<Props, State> {
  static defaultProps = {
    data: [] as TypeTagkv[],
    selectedTagkv: [] as TypeTagkv[],
    type: 'popover',
    wrapInner: undefined,
  };

  [index: string]: any;

  state = {
    data: [] as TypeTagkv[],
    selectedTagkv: [] as TypeTagkv[],
    dynamicSwitch: true,
  } as State;

  componentWillMount() {
    this.preSetState(this.props);
  }

  componentWillReceiveProps(nextProps: Props) {
    if (!_.isEqual(nextProps.data, this.props.data) || !_.isEqual(nextProps.selectedTagkv, this.props.selectedTagkv)) {
      this.preSetState(nextProps);
    }
  }

  getRealSelectedTagv = (tagv: string[], selectedTagv: string[]) => {
    if (_.get(selectedTagv, '[0][0]') === '=') {
      const dynamicTagv = _.get(selectedTagv, '[0]');
      if (dynamicTagv === '=all') {
        if (_.includes(tagv, '<all>')) {
          return _.filter(tagv, o => o !== '<all>');
        }
        return tagv;
      }
      if (dynamicTagv.indexOf('=+') === 0) {
        const dynamicVal = dynamicTagv.substring(2);
        return _.filter(tagv, item => {
          return item.indexOf(dynamicVal) > -1;
        });
      }
      if (dynamicTagv.indexOf('=-') === 0) {
        const dynamicVal = dynamicTagv.substring(2);
        return _.filter(tagv, item => {
          return item.indexOf(dynamicVal) === -1;
        });
      }
      return selectedTagv;
    }
    return selectedTagv;
  };

  hide(key: string) {
    const visibleKey = `${key}visible`;
    this.setState({
      [visibleKey]: false,
    });
  }

  show(key: string) {
    const visibleKey = `${key}visible`;
    this.setState({
      [visibleKey]: true,
    });
  }

  submit(key: string) {
    const { selectedTagkv } = this.state;
    const { onChange } = this.props;
    const multipicker = this[`${key}multipicker`];
    const tagv = multipicker.getSelected();

    this.hide(key);
    onChange(key, tagv, selectedTagkv);
  }

  handleVisibleChange(visible: boolean, key: string) {
    if (visible) {
      this.show(key);
    } else {
      this.submit(key);
      this.hide(key);
    }
  }

  dynamicSelect(key: string, type: string, val?: string) {
    const { selectedTagkv } = this.state;
    const index = _.findIndex(selectedTagkv, { tagk: key });
    let selected;
    if (type === '=all') {
      selected = ['=all'];
    } else if (type === '=+') {
      selected = [`=+${val}`];
    } else if (type === '=-') {
      selected = [`=-${val}`];
    }
    this.setState(
      update(this.state, {
        selectedTagkv: {
          $splice: [
            [
              index,
              1,
              {
                tagk: key,
                tagv: selected,
              },
            ],
          ],
        },
      })
    );
  }

  dynamicSwitchChange = (val: boolean) => {
    this.setState({
      dynamicSwitch: val,
    });
  };

  multipickerChange(key: string, selected: string[]) {
    const { selectedTagkv } = this.state;
    const index = _.findIndex(selectedTagkv, { tagk: key });
    if (hasDtag(selected)) {
      selected.splice(0, 1);
    }
    this.setState(
      update(this.state, {
        selectedTagkv: {
          $splice: [
            [
              index,
              1,
              {
                tagk: key,
                tagv: selected,
              },
            ],
          ],
        },
      })
    );
  }

  preSetState(props: Props) {
    const { data, selectedTagkv } = props;
    const rdata = _.cloneDeep(data);
    const ldata = sortTagkvs(rdata);
    this.setState({
      data: ldata,
      selectedTagkv: _.cloneDeep(selectedTagkv),
    });
  }

  render() {
    const { type } = this.props;
    const { data, selectedTagkv, dynamicSwitch } = this.state;
    return (
      <>
        {_.map(data, o => {
          const { tagk, tagv = [] } = o;
          const currentTagkv = _.find(selectedTagkv, { tagk });
          const selectedTagv = currentTagkv ? currentTagkv.tagv : [];
          const realSelectedTagv = this.getRealSelectedTagv(tagv, selectedTagv);
          const content = (
            <span>
              <Multipicker
                manualEntry={tagk === 'endpoint'}
                ref={ref => {
                  this[`${tagk}multipicker`] = ref;
                }}
                data={tagv}
                selected={selectedTagv}
                onChange={(selected: string[]) => this.multipickerChange(tagk, selected)}
              />
              <div style={{ marginTop: 10, textAlign: 'center' }}>
                <Button.Group>
                  <Button onClick={() => this.hide(tagk)}>Cancel</Button>
                  <Button type="primary" onClick={() => this.submit(tagk)}>
                    Ok
                  </Button>
                </Button.Group>
              </div>
              <div
                ref={ref => {
                  this[`${tagk}dynamic`] = ref;
                }}
                style={{ position: 'absolute', top: 41, right: 18 }}
              >
                {dynamicSwitch ? (
                  <span>
                    {/* <span><FormattedMessage id="select.dynamic" />： </span> */}
                    <a onClick={() => this.dynamicSelect(tagk, '=all')}>all</a>
                    <span className="ant-divider" />
                    <Popover
                      trigger="click"
                      content={
                        <div style={{ width: 200 }}>
                          <Input
                            placeholder="Press enter to submit"
                            onKeyDown={(e: any) => {
                              if (e.keyCode === 13) {
                                this.dynamicSelect(tagk, '=+', e.target.value);
                              }
                            }}
                          />
                        </div>
                      }
                      getTooltipContainer={() => this[`${tagk}dynamic`]}
                    >
                      <a>include</a>
                    </Popover>
                    <span className="ant-divider" />
                    <Popover
                      trigger="click"
                      content={
                        <div style={{ width: 200 }}>
                          <Input
                            placeholder="请输入关键词，Enter键提交"
                            onKeyDown={(e: any) => {
                              if (e.keyCode === 13) {
                                this.dynamicSelect(tagk, '=-', e.target.value);
                              }
                            }}
                          />
                        </div>
                      }
                      getTooltipContainer={() => this[`${tagk}dynamic`]}
                    >
                      <a>exclude</a>
                    </Popover>
                  </span>
                ) : (
                  <div>
                    dynamic value <Switch onChange={this.dynamicSwitchChange} size="small" />
                  </div>
                )}
              </div>
            </span>
          );
          let itemContent;

          if (type === 'popover') {
            itemContent = (
              <Popover
                key={tagk}
                content={content}
                title={tagk}
                trigger="click"
                placement="topLeft"
                visible={!!this.state[`${tagk}visible`]}
                onVisibleChange={visible => this.handleVisibleChange(visible, tagk)}
              >
                {this.props.renderItem(tagk, tagv, realSelectedTagv, this.show.bind(this))}
              </Popover>
            );
          } else {
            itemContent = (
              <div>
                <Modal
                  title={tagk}
                  width={450}
                  wrapClassName="tagkvModal"
                  visible={!!this.state[`${tagk}visible`]}
                  closable={false}
                  onCancel={() => {
                    this.hide('tagk');
                  }}
                  footer={[]}
                >
                  {content}
                </Modal>
                {this.props.renderItem(tagk, tagv, selectedTagv, this.show.bind(this))}
              </div>
            );
          }
          if (this.props.wrapInner) {
            itemContent = this.props.wrapInner(itemContent, tagk, tagv, selectedTagv);
          }
          return itemContent;
        })}
      </>
    );
  }
}
