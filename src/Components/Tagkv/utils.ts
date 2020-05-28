import _ from 'lodash';
import { TypeTagkv } from './types';

const DtagKws = ['=all', '=+', '=-'];
export type DynamicHostsType = '=all' | '=+' | '=-';
function hasDtagByStrArr(data: string) {
  return _.some(DtagKws, o => {
    return data.indexOf(o) === 0;
  });
}

function realSortTagkvs(tagkvs: TypeTagkv[], compareGetter: any) {
  return _.map(tagkvs, o => {
    if (!(o && o.tagv && o.tagv.length !== 0)) {
      return o;
    }

    o.tagv = o.tagv.sort((a, b) => {
      return compareGetter(a, b);
    });
    return o;
  });
}

export function hasDtag(data: Array<TypeTagkv | string> = []) {
  return _.some(data, item => {
    if (_.isObject(item) && _.isArray(item.tagv)) {
      return _.some(item.tagv, subItem => {
        if (_.isString(subItem)) {
          return hasDtagByStrArr(subItem);
        }
        return false;
      });
    }
    if (_.isString(item)) {
      return hasDtagByStrArr(item);
    }
    return false;
  });
}

export function sortTagkvs(tagkvs: TypeTagkv[]) {
  if (!tagkvs) {
    return tagkvs;
  }

  let compareGetter = _.noop;
  try {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    compareGetter = collator.compare;
  } catch (e) {
    console.error(e);
  }
  return realSortTagkvs(tagkvs, compareGetter);
}

export function getDTagvKeyword(firstTagv: DynamicHostsType | string) {
  if (firstTagv === '=all') {
    return '=all';
  }
  if (firstTagv.indexOf('=+') === 0) {
    return '=+';
  }
  if (firstTagv.indexOf('=-') === 0) {
    return '=-';
  }
  return undefined;
}

export function dFilter(dType: string, firstTagv: string, currentTagv: string[]) {
  const dValue = firstTagv.replace(dType, '');
  const reg = new RegExp(dValue);
  return _.filter(currentTagv, o => {
    if (dType === '=all') {
      return true;
    }
    if (dType === '=+') {
      return reg.test(o);
    }
    if (dType === '=-') {
      return !reg.test(o);
    }
    return false;
  });
}
