declare const echarts: any;
const container = document.getElementById('mychart') as HTMLDivElement;
const myChart = echarts.init(container);
const scatterChart = echarts.init(document.getElementById('scatterchart'));

// treeChart
const option: any = {
    tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove'
    },
    series: [
        {
            type: 'tree',
            data: [],
            left: '2%',
            right: '2%',
            top: '12%',
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
                fontSize: 18,
                color: '#ddd',
                borderWidth: 1,
                backgroundColor: '#7b60bc',
                padding: [6, 10],
                borderRadius: 20,
                rich: {
                    a: {
                        color: '#fff',
                        fontSize: 18,
                        fontWeight: 'bold'
                    },
                }
            },
            leaves: {
                label: {
                    position: 'bottom',
                }
            },
            animationDurationUpdate: 750
        }
    ]
};

const scatterOption: any = {
    xAxis: {
        splitLine: {
            lineStyle: {
                type: 'dashed'
            }
        }
    },
    yAxis: {
        splitLine: {
            lineStyle: {
                type: 'dashed'
            }
        },
        // scale: true
    },
    series: [{
        type: 'effectScatter',
        symbolSize: 12,
        emphasis: {
            label: {
                show: true,
                color: 'black',
                formatter: function (param: any) {
                    return param.data.join();
                },
                position: 'top'
            }
        },
        data: []
    }, {
        data: [],
        type: 'scatter',
        symbolSize: 12,
        emphasis: {
            label: {
                show: true,
                formatter: function (param: any) {
                    return param.data.join();
                },
                position: 'top'
            }
        },
        itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(120, 36, 50, 0.5)',
            shadowOffsetY: 5,
            color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [{
                offset: 0,
                color: 'rgb(251, 118, 123)'
            }, {
                offset: 1,
                color: 'rgb(204, 46, 72)'
            }])
        }
    }, {
        data: [],
        type: 'scatter',
        symbolSize: 12,
        emphasis: {
            label: {
                show: true,
                formatter: function (param: any) {
                    return param.data.join();
                },
                position: 'top'
            }
        },
        itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(25, 100, 150, 0.5)',
            shadowOffsetY: 5,
            color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [{
                offset: 0,
                color: 'rgb(129, 227, 238)'
            }, {
                offset: 1,
                color: 'rgb(25, 183, 207)'
            }])
        }
    }],
    animation: "auto",
    animationDuration: 1000,
    animationDurationUpdate: 0,
    animationEasing: "exponentialOut",
    animationEasingUpdate: "cubicOut",
    animationThreshold: 2000
};
scatterChart.setOption(scatterOption);





type ChartData = {
    name: number | string;
    children?: ChartData[];
    label?: any;
};

/******************************************************/
type Item = number[];

type TreeNode = {
    item: Item;
    left: TreeNode;
    right: TreeNode;
} | NullNodeType;
type NullNodeType = {
    item: Item;
    left: NullNodeType;
    right: NullNodeType;
};
const NULLNODE: NullNodeType = {
    item: [-Infinity, -Infinity],
    left: undefined,
    right: undefined
} as unknown as NullNodeType;
NULLNODE.left = NULLNODE.right = NULLNODE;

function itemCompare(item1: Item, item2: Item, dimension?: number): number {
    if (typeof dimension === 'number') {
        return item1[dimension] - item2[dimension];
    }
    return item1[0] - item2[0] || item1[1] - item2[1];
}
function isInRange(low: Item, high: Item, item: Item): boolean {
    return item.every((num: number, index: number) =>
        low[index] <= num && num <= high[index]);
}

class KDTree {
    root: TreeNode;
    table: Item[] = [];
    constructor(public readonly k: number, data?: Item[]) {
        this.root = NULLNODE;
        if (data) {
            this.table = data;
            this.build(data);
        }
    }
    build(data: Item[]) {
        this.root = this._build(data, 0);
    }
    private _build(data: Item[], dimension: number): TreeNode {
        if (data.length === 0) {
            return NULLNODE;
        }
        data.sort((a, b) => a[dimension] - b[dimension]);
        let middle = ~~((data.length - 1) / 2);
        let low = data.slice(0, middle);
        let high = data.slice(middle + 1, data.length);
        let node = this.createNode(data[middle]);
        node.left = this._build(low, this.nextDimension(dimension));
        node.right = this._build(high, this.nextDimension(dimension));
        return node;
    }
    rebuild() {
        this.build(this.table);
    }
    createNode(item: Item): TreeNode {
        return {
            item,
            left: NULLNODE,
            right: NULLNODE
        };
    }
    show(showScatter = true, list?: Item[]) {
        let data: ChartData = this.createChartData(this.root, 0, list);
        option.series[0].data = [{ name: '', children: [data] }];
        myChart.setOption(option);
        showScatter && this.showScatter();
    }
    private createChartData(node: TreeNode, dimension: number, list?: Item[]): ChartData {
        if (node === NULLNODE) {
            return { name: '', label: { padding: 0 } };
        }
        let arr = node.item.slice(0);
        (arr[dimension] as any) = `{a|${arr[dimension]}}`
        let data: ChartData = {
            name: `${arr.join(' | ')}`,
            children: [],
        }
        if (list && list.includes(node.item)) {
            data.label = { backgroundColor: '#dd4444' };
        }
        data.children![0] = this.createChartData(node.left, this.nextDimension(dimension), list);
        data.children![1] = this.createChartData(node.right, this.nextDimension(dimension), list);
        if (data.children!.every(item => item.name === '')) {
            data.children = [];
        }
        return data;
    }
    private showScatter() {
        scatterOption.series[2].data = this.table;
        scatterChart.setOption(scatterOption);
    }

    private nextDimension(dimension: number): number {
        return ++dimension % this.k;
    }
    insert(item: Item) {
        this.root = this._insert(item, this.root, 0);
    }
    private _insert(item: Item, node: TreeNode, dimension: number): TreeNode {
        if (node === NULLNODE) {
            this.table.push(item);
            return this.createNode(item);
        }
        if (itemCompare(item, node.item, dimension) < 0) {
            node.left = this._insert(item, node.left, this.nextDimension(dimension));
        } else {
            node.right = this._insert(item, node.right, this.nextDimension(dimension));
        }
        return node;
    }
    range(low: Item, high: Item, callback: Function) {
        this._range(low, high, 0, this.root, callback);
    }
    private _range(low: Item, high: Item, dimension: number, node: TreeNode, callback: Function) {
        if (node === NULLNODE) {
            return;
        }
        if (isInRange(low, high, node.item)) {
            callback(node.item);
        }
        if (itemCompare(node.item, low, dimension) >= 0) {
            this._range(low, high, this.nextDimension(dimension), node.left, callback);
        }
        if (itemCompare(node.item, high, dimension) <= 0) {
            this._range(low, high, this.nextDimension(dimension), node.right, callback);
        }
    }
    KNN(item: Item, k = 3): Item[] {
        let list: { item: Item, distance: number }[] = [];
        const getDistance = (curItem: Item): number => {
            return Math.sqrt(Math.pow(item[0] - curItem[0], 2) + Math.pow(item[1] - curItem[1], 2));
        };
        /* k大的话应该改用优先队列 */
        const pushToList = (curItem: Item, dimension: number): boolean => {
            let listItem = {
                item: curItem,
                distance: getDistance(curItem)
            };
            if (list.length < k) {
                list.push(listItem);
                list.sort((a, b) => b.distance - a.distance);
                return true;
            }
            if (listItem.distance <= list[0].distance) {
                list[0] = listItem;
                list.sort((a, b) => b.distance - a.distance);
                return true;
            }
            return Math.abs(curItem[dimension] - item[dimension]) <= list[0].distance;
        };
        const recusion = (node: TreeNode, dimension: number) => {
            if (node === NULLNODE) {
                return;
            }
            if (itemCompare(item, node.item, dimension) < 0) {
                recusion(node.left, this.nextDimension(dimension));
                if (pushToList(node.item, dimension)) {
                    recusion(node.right, this.nextDimension(dimension));
                }
            } else {
                recusion(node.right, this.nextDimension(dimension));
                if (pushToList(node.item, dimension)) {
                    recusion(node.left, this.nextDimension(dimension));
                }
            }
        };
        recusion(this.root, 0);
        this.showKNNPoints(list.map((listItem) => listItem.item));
        return list.map((listItem) => listItem.item);
    }
    showKNNPoints(list: Item[]) {
        this.show(false, list);
        let data2 = this.table.slice(0);
        list.forEach(item => {
            let idx = data2.indexOf(item);
            if (idx > -1) {
                data2.splice(idx, 1);
            }
        });
        scatterOption.series[0].data = list;
        scatterOption.series[2].data = data2;
        scatterChart.setOption(scatterOption);
    }
}


let tree: KDTree;
let testcase: number[][] = [];
function two() {
    testcase = [
        [53, 14],
        [27, 28],
        [67, 50],
        [30, 11],
        [31, 85],
        [79, 3],
        [99, 90],
        [29, 16],
        [40, 26],
        [7, 39],
        [32, 29],
        [82, 64],
        [38, 23],
        [15, 61],
        [73, 75],
    ];
    // testcase.reverse()
    tree = new KDTree(2, testcase);

    /* for (let item of testcase) {
        tree.insert(item);
    } */
    tree.show()
}

function three() {
    testcase = [
        [3, 1, 4],
        [2, 3, 7],
        [4, 3, 4],
        [2, 1, 3],
        [2, 4, 5],
        [6, 1, 4],
        [1, 4, 4],
        [0, 5, 7],
        [5, 2, 5],
        [4, 0, 6],
        [7, 1, 6],
    ];
    tree = new KDTree(3, testcase);
    // testcase.reverse()
    /* for (let item of testcase) {
        tree.insert(item);
    } */
    tree.show()
}
function random() {
    testcase = [];
    for (let i = 0; i < 23; i++) {
        testcase.push([
            ~~(Math.random() * 100),
            ~~(Math.random() * 100),
            // ~~(Math.random() * 100),
            // ~~(Math.random() * 100),
        ]);
    }
    tree = new KDTree(2);

    for (let item of testcase) {
        // tree.insert(item);
    }
    tree.show()
}
// two();
// three()
random();
// tree.range([-Infinity,-Infinity,-Infinity],[Infinity,Infinity,Infinity],(item:Item)=>console.log(item))
// tree.range([2, 2, 2], [5, 5, 5], (item: Item) => console.log(item))

let idx = 0;
function insertToTree() {
    if (idx < testcase.length) {
        let item = testcase[idx++].slice(0);
        tree.insert(item);
        tree.show();
    }
}
function rebuild() {
    tree.rebuild();
    tree.show(false);
}
function openScatter() {
    container.style.width = '50%';
    (document.getElementById('scatterchart')!.parentNode as HTMLDivElement).style.display = 'block';
    myChart.resize();
    scatterChart.resize();
}
// openScatter();

scatterChart.on('click', 'series', (params: any) => {
    tree.KNN(params.data, 4);
})