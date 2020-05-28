export interface TypeTreeNode {
  id: number;
  pid: number;
  name: string;
  path: string;
  type: number;
  leaf: number;
  cate?: string;
  children?: TypeTreeNode[];
  icon_color: string;
  icon_char: string;
}
