import React from 'react';
import isArray from 'lodash/isArray';
import cloneDeep from 'lodash/cloneDeep';
import sortedIndexBy from 'lodash/sortedIndexBy';
import isEqual from 'lodash/isEqual';
import find from 'lodash/find';
import TreeSelect from 'antd/lib/tree-select';
import 'antd/lib/tree-select/style/index';
import { TypeTreeNode } from './types';

export function findNode(treeData: TypeTreeNode[], node: TypeTreeNode) {
  let findedNode: TypeTreeNode | undefined;
  function findNodeReal(treeData: TypeTreeNode[], node: TypeTreeNode) {
    treeData.forEach(item => {
      if (item.id === node.pid) {
        findedNode = item;
        return false;
      } else if (isArray(item.children)) {
        findNodeReal(item.children, node);
      }
      return true;
    });
  }
  findNodeReal(treeData, node);
  return findedNode;
}

export function normalizeTreeData(data: TypeTreeNode[]) {
  const treeData: TypeTreeNode[] = [];
  let tag = 0;

  function fn(_cache?: TypeTreeNode[]) {
    const cache: TypeTreeNode[] = [];
    data.forEach(node => {
      node = cloneDeep(node);
      if (node.pid === 0) {
        if (tag === 0) {
          treeData.splice(sortedIndexBy(treeData, node, 'name'), 0, node);
        }
      } else {
        const findedNode = findNode(treeData, node); // find parent node
        if (!findedNode) {
          cache.push(node);
          return;
        }
        if (isArray(findedNode.children)) {
          if (!find(findedNode.children, { id: node.id })) {
            findedNode.children.splice(sortedIndexBy(findedNode.children, node, 'name'), 0, node);
          }
        } else {
          findedNode.children = [node];
        }
      }
    });
    tag += 1;
    if (cache.length && !isEqual(_cache, cache)) {
      fn(cache);
    }
  }
  fn();
  return treeData;
}

export function renderTreeNodes(nodes: TypeTreeNode[]) {
  return nodes.map(node => {
    if (isArray(node.children)) {
      return (
        <TreeSelect.TreeNode title={node.name} key={String(node.id)} value={node.id} path={node.path}>
          {renderTreeNodes(node.children)}
        </TreeSelect.TreeNode>
      );
    }
    return (
      <TreeSelect.TreeNode
        title={node.name}
        key={String(node.id)}
        value={node.id}
        path={node.path}
        isLeaf={node.leaf === 1}
      />
    );
  });
}

interface TypeProps {
  loading: boolean;
  treeData: TypeTreeNode[];
  value?: number;
  onChange: (value: number) => void;
}

export default function index(props: TypeProps) {
  return (
    <TreeSelect
      loading={props.loading}
      showSearch
      style={{ width: '100%' }}
      dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
      placeholder="Please select"
      allowClear
      treeDefaultExpandAll
      treeNodeFilterProp="title"
      treeNodeLabelProp="path"
      value={props.value}
      onChange={props.onChange}
    >
      {renderTreeNodes(props.treeData)}
    </TreeSelect>
  );
}
