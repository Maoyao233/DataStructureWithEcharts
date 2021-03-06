/*
 * B树定义：
 * 每个节点最多有M-1个关键字
 * 非根节点至少有M/2个关键字
 * ......
*/
declare const echarts: any;
const container = document.getElementById('mychart') as HTMLDivElement;
const myChart = echarts.init(container);

const option: any = {
    tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove'
    },
    series: [
        {
            type: 'tree',
            // data: [data],
            data: [],
            left: '2%',
            right: '2%',
            top: '8%',
            bottom: '20%',
            symbol: 'emptyCircle',
            orient: 'vertical',
            expandAndCollapse: true,
            lineStyle: {
                curveness: 0,
                color: '#f9d0c4',
            },
            initialTreeDepth: -1,
            // symbolSize:20,
            label: {
                position: 'top',
                align: 'middle',
                fontSize: 19,
                color: '#fff',
                borderWidth: 1,
                backgroundColor: '#7b60bc',
                padding: 10,
                borderRadius: 20
            },
            leaves: {
                label: {
                    position: 'bottom',
                    align: 'middle',
                    backgroundColor: '#2cbe4e',
                    borderRadius: 0,
                }
            },
            animationDurationUpdate: 750
        }
    ]
};

type ChartData = {
    name: number | string;
    children?: ChartData[];
};

/******************************************************/
type Item = {
    num: number;
};
type TreeNode = {
    itemKeys: Item[];
    children: (TreeNode | Item[])[],
};
type Leaf = Item[];

function itemCompare(item1: Item, item2: Item): number {
    return item2.num - item1.num;
}

class BPlusTree {
    root: TreeNode | null;
    readonly M: number;
    readonly splitIdx: number;
    constructor(M: number) {
        this.root = null;
        this.M = M;
        this.splitIdx = Math.ceil((this.M + 1) / 2);
    }
    find(item: Item | number): Item | undefined {
        if (!this.root) {
            return undefined;
        }
        if (typeof item === 'number') {
            item = { num: item };
        }
        return this._find(this.root, item);
    }
    private _find(node: TreeNode, item: Item): Item | undefined {
        if (!node.itemKeys) {
            let leaf: Leaf = node as any;
            return leaf.find((leafItem: Item) => leafItem.num === item.num);
        }
        let idx = this.findPathIdx(node.itemKeys, item);
        return this._find(node.children[idx] as TreeNode, item);
    }
    private splitNode(node: TreeNode): TreeNode {
        let leftSplitNode: TreeNode = {
            itemKeys: node.itemKeys.slice(0, this.splitIdx - 1),
            children: node.children.slice(0, this.splitIdx)
        };
        let rightSplitNode: TreeNode = {
            itemKeys: node.itemKeys.slice(this.splitIdx),
            children: node.children.slice(this.splitIdx)
        }
        return {
            itemKeys: [node.itemKeys[this.splitIdx - 1]],
            children: [leftSplitNode, rightSplitNode]
        }
    }
    addItem(item: Item) {
        if (!this.root) {
            this.root = this.createNode(item);
            this.root.children = [[], [item]];
            return;
        }
        this.root = this._addItem(this.root, item) as TreeNode;
        if (this.root.itemKeys.length === this.M) {
            console.log('split root node')
            this.root = this.splitNode(this.root);
        }
    }
    private _addItem(node: TreeNode | Leaf, item: Item): TreeNode | Leaf {
        if (!(node as TreeNode).itemKeys) {
            //到底了
            let leaf: Leaf = node as Leaf;
            return this.insertItem(leaf, item);
        } else {
            node = node as TreeNode;
            let idx = this.findPathIdx(node.itemKeys, item);
            node.children[idx] = this._addItem(node.children[idx], item);
            let leftNode: any = node.children[idx - 1];
            let middleNode: any = node.children[idx];
            let rightNode: any = node.children[idx + 1];
            if (middleNode.itemKeys) {
                // 处理node分裂，暂不采用node合并的策略了，直接分裂
                if (middleNode.itemKeys.length === this.M) {
                    if (rightNode && rightNode.itemKeys.length < this.M - 1) {
                        console.log('move node to next simbling')
                        rightNode.children.unshift(middleNode.children.pop());
                        rightNode.itemKeys.unshift(node.itemKeys[idx]);
                        node.itemKeys.splice(idx, 1, middleNode.itemKeys.pop());
                    } else if (leftNode && leftNode.itemKeys.length < this.M - 1) {
                        console.log('move node to prev simbling')
                        leftNode.children.push(middleNode.children.shift());
                        leftNode.itemKeys.push(node.itemKeys[idx - 1]);
                        node.itemKeys.splice(idx - 1, 1, middleNode.itemKeys.shift());
                    } else {
                        console.log('split node')
                        let splitNode = this.splitNode(middleNode);
                        // 只管把分裂后的node塞进自已里，自己装不装得下应由父级考虑
                        node.itemKeys.splice(idx, 0, ...splitNode.itemKeys);
                        node.children.splice(idx, 1, ...splitNode.children);
                    }
                }
            } else {
                // 处理leaf分裂
                if (middleNode.length > this.M) {
                    // 先看能不能移向兄弟结点
                    if (rightNode && rightNode.length < this.M) {
                        console.log('move to next simbling');
                        let item: Item = middleNode.pop();
                        rightNode.unshift(item);
                        node.itemKeys[idx] = item;// 浅复制，是否可行?内存中应该不存在，硬盘中要深复制
                    } else if (leftNode && leftNode.length < this.M) {
                        console.log('move to prev simbling');
                        let item: Item = middleNode.shift();
                        leftNode.push(item);
                        node.itemKeys[idx - 1] = middleNode[0];// 浅复制，是否可行?内存中应该不存在，硬盘中要深复制
                    } else {
                        // 自身分裂，其余交给父级处理
                        console.log('split item it self')
                        node.children.splice(idx, 1, middleNode.slice(0, this.splitIdx), middleNode.slice(this.splitIdx));
                        // 更新itemKeys
                        if (node.itemKeys[idx]) {
                            node.itemKeys.splice(idx, 0, (node.children[idx + 1] as Leaf)[0])
                        } else {
                            node.itemKeys[idx] = (node.children[idx + 1] as Leaf)[0];
                        }
                    }
                }
            }
            return node;
        }
    }
    private createNode(item: Item): TreeNode {
        return {
            itemKeys: [item],
            children: []
        }
    }
    private findPathIdx(itemKeys: Item[], item: Item): number {
        // 后面可换成二分查找
        let idx = itemKeys.findIndex((nodeItem: Item) => {
            return nodeItem.num > item.num;
        });
        return idx === -1 ? itemKeys.length : idx;
    }
    private insertItem(leaf: Item[], item: Item): Leaf {
        let idx = this.findPathIdx(leaf, item);
        leaf.splice(idx, 0, item);
        return leaf;
    }
    show() {
        let data: ChartData = this.getChartData(this.root);
        option.series[0].data = [data];
        myChart.setOption(option);
    }
    private getChartData(node: TreeNode | Leaf | null): ChartData {
        if (!node) {
            return { name: new Array(this.M - 1).fill('--').join('|') };
        }
        if (node && (node as TreeNode).children) {
            let items: Item[] = (node as TreeNode).itemKeys;
            let arr: (number | string)[] = items.map(item => item.num);
            for (let i = items.length; i < this.M - 1; i++) {
                arr.push('--');
            }
            let data: ChartData = { name: arr.join(' | '), children: [] };
            (node as TreeNode).children.forEach(childNode => {
                data.children!.push(this.getChartData(childNode));
            });
            return data;
        }
        return {
            name: (node as Leaf).map(item => item.num).join() || '--'
        };
    }
    getLeafSize() {
        return this._getLeafSize(this.root);
    }
    private _getLeafSize(node: any): number {
        if (node && node.children) {
            let sum = 0;
            node.children.forEach((item: any) => {
                sum += this._getLeafSize(item);
            });
            return sum;
        }
        return node.length;
    }
    deleteItem(item: Item) {
        if (!this.root) {
            return;
        }
        this._deleteItem(this.root, item);
        if (this.root.children.length === 1) {
            if ((this.root.children[0] as TreeNode).itemKeys) {
                this.root = this.root.children[0] as TreeNode;
            } else if (!(this.root.children[0] as Leaf).length) {
                this.root = null;
            }
        }
    }
    private _deleteItem(node: TreeNode | Leaf, item: Item): Item | undefined {
        if (!(node as TreeNode).itemKeys) {
            let leaf: Leaf = node as any;
            let idx: number = leaf.findIndex((leafItem: Item) => leafItem.num === item.num);
            if (idx < 0) {
                console.log('item is not in tree');
                return;
            }
            leaf.splice(idx, 1);
            return idx === 0 ? leaf[0] : undefined;
        }
        node = node as TreeNode;
        let idx = this.findPathIdx(node.itemKeys, item);
        let backItem = this._deleteItem(node.children[idx], item);
        let leftNode: any = node.children[idx - 1];
        let middleNode: any = node.children[idx];
        let rightNode: any = node.children[idx + 1];
        if (backItem && node.itemKeys[idx - 1]) {
            node.itemKeys[idx - 1] = backItem;
            backItem = undefined;
        }
        if (!middleNode.itemKeys) {
            // 处理叶子节点的合并
            // 3树，叶子小于2时合并，左右叶子有大于2时先分
            // 4树，叶子小于2时合并，左右叶子有大于2时先分
            // 5           3                    3
            // 6           3                    3
            let unionLimit = Math.ceil(this.M / 2);
            if (middleNode.length < unionLimit) {
                if (leftNode && leftNode.length > unionLimit) {
                    console.log('fill with left leaf item')
                    middleNode.unshift(leftNode.pop());
                    node.itemKeys[idx - 1] = middleNode[0];
                } else if (rightNode && rightNode.length > unionLimit) {
                    console.log('fill with right leaf item')
                    middleNode.push(rightNode.shift());
                    node.itemKeys[idx] = rightNode[0];
                } else {
                    console.log('union leaf')
                    if (leftNode) {
                        leftNode.push(...middleNode);
                        node.children.splice(idx, 1);
                        node.itemKeys.splice(idx - 1, 1);
                    } else if (rightNode) {
                        rightNode.unshift(...middleNode);
                        node.children.splice(idx, 1);
                        node.itemKeys.splice(idx, 1);
                    }
                }
            }
        } else {
            // 处理node的合并
            // 3树，node小于1时合并，左右node有大于1时先分
            // 4树，node小于2时合并，左右node有大于2时先分 
            // 5           2                    2
            // 6           3                    3
            // 即splitIdx - 1，但M为偶数时还要使合并后叶子节点不大于M。
            if (middleNode.itemKeys.length < this.splitIdx - 1) {
                if (leftNode && leftNode.itemKeys.length > this.splitIdx - 1) {
                    console.log('fill with left node')
                    middleNode.children.unshift(leftNode.children.pop());
                    middleNode.itemKeys.unshift(node.itemKeys[idx - 1]);
                    node.itemKeys[idx - 1] = leftNode.itemKeys.pop();
                } else if (rightNode && rightNode.itemKeys.length > this.splitIdx - 1) {
                    console.log('fill with right node')
                    middleNode.children.push(rightNode.children.shift());
                    middleNode.itemKeys.push(node.itemKeys[idx]);
                    node.itemKeys[idx] = rightNode.itemKeys.shift();
                } else {
                    if (leftNode && leftNode.children.length + middleNode.children.length <= this.M) {
                        console.log('union left node')
                        leftNode.children.push(...middleNode.children);
                        leftNode.itemKeys.push(...node.itemKeys.splice(idx - 1, 1));
                        leftNode.itemKeys.push(...middleNode.itemKeys);
                        node.children.splice(idx, 1);
                    } else if (rightNode && rightNode.children.length + middleNode.children.length <= this.M) {
                        console.log('union right node')
                        rightNode.children.unshift(...middleNode.children);
                        rightNode.itemKeys.unshift(...node.itemKeys.splice(idx, 1));
                        rightNode.itemKeys.unshift(...middleNode.itemKeys);
                        node.children.splice(idx, 1);
                    }
                }
            }
        }
        return backItem;
    }
    findAll(callback: (item: Item, ...params: any) => any) {
        if (!this.root) {
            return;
        }
        this._findAll(this.root, callback);
    }
    private _findAll(node: TreeNode | Leaf, callback: (item: Item, ...params: any) => any) {
        if (!(node as TreeNode).itemKeys) {
            let leaf: Leaf = node as any;
            leaf.forEach(callback);
            return;
        }
        node = node as TreeNode;
        node.children.forEach((childNode: TreeNode | Leaf) => {
            this._findAll(childNode, callback);
        });
    }
    findInRange(min: number, max: number): Item[] {
        if (!this.root) {
            return [];
        }
        let items: Item[] = [];
        this._findInRange(this.root, min, max, items);
        return items;
    }
    private _findInRange(node: TreeNode | Leaf, min: number, max: number, items: Item[]) {
        if (!(node as TreeNode).itemKeys) {
            let leaf: Leaf = node as any;
            for (let i = 0; i < leaf.length; i++) {
                if (leaf[i].num > max) {
                    break;
                }
                if (leaf[i].num >= min) {
                    items.push(leaf[i]);
                }
            }
            return;
        }
        node = node as TreeNode;
        let idxMin = this.findPathIdx(node.itemKeys, { num: min });
        let idxMax = this.findPathIdx(node.itemKeys, { num: max });
        for (let i = idxMin; i <= idxMax; i++) {
            this._findInRange(node.children[i], min, max, items);
        }
    }
}

const tree = new BPlusTree(4);
let testcase = [40, 20, 10, 5, 2, 60, 70, 75, 77, 30, 50, 15, 25, 35, 45, 55, 65, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72, 40, 20, 10, 5, 2, 60, 70, 75, 77, 30, 50, 15, 25, 35, 45, 55, 65, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72];
let index = 0;
const nextNumber = document.getElementById('next-number') as HTMLSpanElement;
const currentNumber = document.getElementById('current-number') as HTMLSpanElement;
showNumber();
tree.show();
function insertToTree() {
    tree.addItem({ num: testcase[index++] });
    tree.show();
    showNumber();
}

function deleteFromTree() {
    tree.deleteItem({ num: testcase[--index] });
    tree.show();
    showNumber();
}

function showNumber() {
    currentNumber.innerHTML = '' + (testcase[index - 1] || '');
    nextNumber.innerHTML = '' + testcase[index];
}